package com.momcare.server

import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.statements.api.ExposedBlob
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import java.sql.Connection

object Users : Table("users") {
    val id = long("id").autoIncrement()
    val email = varchar("email", 254).uniqueIndex()
    val nickname = varchar("nickname", 40)
    val passwordHash = varchar("password_hash", 255)
    /** 비밀번호 변경 시 증가시켜 기존 토큰을 무효화 */
    val tokenVersion = integer("token_version").default(0)
    val createdAt = long("created_at")
    override val primaryKey = PrimaryKey(id)
}

object Backups : Table("backups") {
    val userId = long("user_id").references(Users.id)
    /** 앱에서 AES-GCM 으로 암호화된 데이터 (서버는 내용을 알 수 없음) */
    val data = blob("data")
    val size = long("size")
    val updatedAt = long("updated_at")
    override val primaryKey = PrimaryKey(userId)
}

data class UserRecord(
    val id: Long,
    val email: String,
    val nickname: String,
    val passwordHash: String,
    val tokenVersion: Int,
    val createdAt: Long
)

data class BackupMeta(val size: Long, val updatedAt: Long)

object DatabaseFactory {
    fun init(config: AppConfig): Database {
        val db = if (config.dbUser != null) {
            Database.connect(config.jdbcUrl, user = config.dbUser, password = config.dbPassword ?: "")
        } else {
            Database.connect(config.jdbcUrl)
        }
        if (config.jdbcUrl.startsWith("jdbc:sqlite")) {
            // SQLite 는 SERIALIZABLE 만 지원
            TransactionManager.manager.defaultIsolationLevel = Connection.TRANSACTION_SERIALIZABLE
        }
        transaction(db) { SchemaUtils.create(Users, Backups) }
        return db
    }
}

/** 사용자·백업 저장소 */
class Repository(private val db: Database) {

    private suspend fun <T> tx(block: () -> T): T = newSuspendedTransaction(Dispatchers.IO, db) { block() }

    private fun ResultRow.toUser() = UserRecord(
        id = this[Users.id], email = this[Users.email], nickname = this[Users.nickname],
        passwordHash = this[Users.passwordHash], tokenVersion = this[Users.tokenVersion], createdAt = this[Users.createdAt]
    )

    suspend fun findByEmail(email: String): UserRecord? = tx {
        Users.selectAll().where { Users.email eq email }.singleOrNull()?.toUser()
    }

    suspend fun findById(id: Long): UserRecord? = tx {
        Users.selectAll().where { Users.id eq id }.singleOrNull()?.toUser()
    }

    /** 이메일이 이미 있으면 null */
    suspend fun createUser(email: String, nickname: String, passwordHash: String): UserRecord? = tx {
        if (Users.selectAll().where { Users.email eq email }.any()) return@tx null
        val now = System.currentTimeMillis()
        val id = Users.insert {
            it[Users.email] = email
            it[Users.nickname] = nickname
            it[Users.passwordHash] = passwordHash
            it[Users.tokenVersion] = 0
            it[Users.createdAt] = now
        }[Users.id]
        UserRecord(id, email, nickname, passwordHash, 0, now)
    }

    suspend fun updatePassword(id: Long, newHash: String): Int = tx {
        val current = Users.selectAll().where { Users.id eq id }.single()[Users.tokenVersion]
        Users.update({ Users.id eq id }) {
            it[passwordHash] = newHash
            it[tokenVersion] = current + 1
        }
        current + 1
    }

    suspend fun deleteUser(uid: Long) = tx {
        Backups.deleteWhere { Backups.userId eq uid }
        Users.deleteWhere { Users.id eq uid }
    }

    suspend fun saveBackup(uid: Long, bytes: ByteArray): BackupMeta = tx {
        val now = System.currentTimeMillis()
        val updated = Backups.update({ Backups.userId eq uid }) {
            it[data] = ExposedBlob(bytes)
            it[size] = bytes.size.toLong()
            it[updatedAt] = now
        }
        if (updated == 0) {
            Backups.insert {
                it[Backups.userId] = uid
                it[data] = ExposedBlob(bytes)
                it[size] = bytes.size.toLong()
                it[updatedAt] = now
            }
        }
        BackupMeta(bytes.size.toLong(), now)
    }

    suspend fun backupMeta(uid: Long): BackupMeta? = tx {
        Backups.select(Backups.size, Backups.updatedAt).where { Backups.userId eq uid }.singleOrNull()
            ?.let { BackupMeta(it[Backups.size], it[Backups.updatedAt]) }
    }

    suspend fun loadBackup(uid: Long): ByteArray? = tx {
        Backups.selectAll().where { Backups.userId eq uid }.singleOrNull()?.get(Backups.data)?.bytes
    }
}
