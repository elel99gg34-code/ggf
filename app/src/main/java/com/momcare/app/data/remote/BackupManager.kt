package com.momcare.app.data.remote

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.momcare.app.MainActivity
import com.momcare.app.MomCareApp
import com.momcare.app.data.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import kotlin.system.exitProcess

/**
 * 데이터베이스 + 일기 사진을 하나의 묶음으로 만들고, 서버나 파일로 백업/복원한다.
 * 복원 후에는 Room 이 새 파일을 읽도록 앱을 다시 시작한다.
 */
class BackupManager(private val context: Context) {

    private val app get() = context.applicationContext as MomCareApp
    private val session get() = app.container.session
    private val api get() = app.container.api

    // ───────── 묶음 만들기 / 풀기 ─────────

    /** DB 를 체크포인트한 뒤 DB 파일과 일기 사진을 zip 으로 묶는다 */
    suspend fun createBundle(): ByteArray = withContext(Dispatchers.IO) {
        val db = app.container.db
        db.openHelper.writableDatabase.query("PRAGMA wal_checkpoint(FULL)").use { it.moveToFirst() }
        val dbFile = context.getDatabasePath(AppDatabase.NAME)
        val photos = File(context.filesDir, "diary").listFiles()?.toList().orEmpty()
        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { zip ->
            zip.putNextEntry(ZipEntry("db/${AppDatabase.NAME}"))
            dbFile.inputStream().use { it.copyTo(zip) }
            zip.closeEntry()
            photos.forEach { f ->
                zip.putNextEntry(ZipEntry("diary/${f.name}"))
                f.inputStream().use { it.copyTo(zip) }
                zip.closeEntry()
            }
        }
        out.toByteArray()
    }

    /** zip 묶음을 검증한 뒤 DB 와 사진을 교체한다. */
    private suspend fun restoreBundle(bundle: ByteArray) = withContext(Dispatchers.IO) {
        val entries = mutableMapOf<String, ByteArray>()
        ZipInputStream(ByteArrayInputStream(bundle)).use { zip ->
            var e = zip.nextEntry
            while (e != null) {
                // 경로 조작(../) 방지: 허용된 폴더의 단순 파일명만 받는다
                val name = e.name
                val ok = (name == "db/${AppDatabase.NAME}") ||
                    (name.startsWith("diary/") && !name.substringAfter("diary/").contains('/') && !name.contains(".."))
                if (!e.isDirectory && ok) entries[name] = zip.readBytes()
                e = zip.nextEntry
            }
        }
        val dbBytes = entries["db/${AppDatabase.NAME}"] ?: error("백업에 데이터가 없어요.")
        require(String(dbBytes.copyOfRange(0, 15)) == "SQLite format 3") { "손상된 백업이에요." }

        app.container.db.close()
        val dbFile = context.getDatabasePath(AppDatabase.NAME)
        File(dbFile.path + "-wal").delete()
        File(dbFile.path + "-shm").delete()
        dbFile.writeBytes(dbBytes)

        val dir = File(context.filesDir, "diary").apply { mkdirs() }
        entries.filterKeys { it.startsWith("diary/") }.forEach { (name, bytes) ->
            File(dir, name.substringAfter("diary/")).writeBytes(bytes)
        }
    }

    // ───────── 서버 백업 ─────────

    suspend fun uploadToServer(): BackupInfo {
        val s = session.session.value ?: throw ApiException(401, "로그인이 필요해요.")
        val key = session.backupKey()?.let { BackupCrypto.keyFromString(it) }
            ?: throw ApiException(401, "암호화 키가 없어요. 다시 로그인해주세요.")
        val encrypted = withContext(Dispatchers.Default) { BackupCrypto.encrypt(key, createBundle()) }
        val info = api.uploadBackup(s.token, encrypted)
        session.lastBackupAt = info.updatedAt
        return info
    }

    suspend fun serverInfo(): BackupInfo? {
        val s = session.session.value ?: return null
        return api.backupInfo(s.token)
    }

    /** 서버 백업을 내려받아 복원한 뒤 앱을 재시작한다 */
    suspend fun restoreFromServer() {
        val s = session.session.value ?: throw ApiException(401, "로그인이 필요해요.")
        val key = session.backupKey()?.let { BackupCrypto.keyFromString(it) }
            ?: throw ApiException(401, "암호화 키가 없어요. 다시 로그인해주세요.")
        val encrypted = api.downloadBackup(s.token)
        val bundle = withContext(Dispatchers.Default) { BackupCrypto.decrypt(key, encrypted) }
        restoreBundle(bundle)
        restartApp()
    }

    // ───────── 파일 백업 (기기 저장소 / 다른 앱으로 보내기) ─────────

    /** 파일 백업은 사용자가 정한 비밀번호로 암호화한다 */
    suspend fun exportToUri(uri: Uri, password: String) = withContext(Dispatchers.IO) {
        val key = BackupCrypto.deriveKey("file-backup", password)
        val data = BackupCrypto.encrypt(key, createBundle())
        context.contentResolver.openOutputStream(uri)?.use { it.write(data) } ?: error("파일을 저장할 수 없어요.")
    }

    suspend fun importFromUri(uri: Uri, password: String) {
        val data = withContext(Dispatchers.IO) {
            context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: error("파일을 열 수 없어요.")
        }
        val key = BackupCrypto.deriveKey("file-backup", password)
        val bundle = withContext(Dispatchers.Default) { BackupCrypto.decrypt(key, data) }
        restoreBundle(bundle)
        restartApp()
    }

    private fun restartApp() {
        val intent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        context.startActivity(intent)
        exitProcess(0)
    }
}
