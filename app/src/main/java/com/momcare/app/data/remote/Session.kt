package com.momcare.app.data.remote

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** 로그인된 계정 정보 */
data class Session(
    val userId: Long,
    val email: String,
    val nickname: String,
    val token: String
)

/**
 * 로그인 세션과 서버 주소를 보관한다.
 * 백업 암호화 키(비밀번호에서 파생)는 서버로 보내지 않고 이 기기에만 저장한다.
 */
class SessionStore(context: Context) {
    private val sp: SharedPreferences =
        context.getSharedPreferences("momcare_session", Context.MODE_PRIVATE)

    private val _session = MutableStateFlow(load())
    val session: StateFlow<Session?> = _session.asStateFlow()

    private val _serverUrl = MutableStateFlow(sp.getString(KEY_URL, DEFAULT_URL) ?: DEFAULT_URL)
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    private fun load(): Session? {
        val token = sp.getString(KEY_TOKEN, null) ?: return null
        return Session(
            userId = sp.getLong(KEY_ID, 0L),
            email = sp.getString(KEY_EMAIL, "") ?: "",
            nickname = sp.getString(KEY_NICK, "") ?: "",
            token = token
        )
    }

    fun save(s: Session, backupKeyBase64: String) {
        sp.edit()
            .putLong(KEY_ID, s.userId)
            .putString(KEY_EMAIL, s.email)
            .putString(KEY_NICK, s.nickname)
            .putString(KEY_TOKEN, s.token)
            .putString(KEY_BACKUP_KEY, backupKeyBase64)
            .apply()
        _session.value = s
    }

    fun clear() {
        sp.edit()
            .remove(KEY_ID).remove(KEY_EMAIL).remove(KEY_NICK)
            .remove(KEY_TOKEN).remove(KEY_BACKUP_KEY).remove(KEY_LAST_BACKUP)
            .apply()
        _session.value = null
    }

    fun backupKey(): String? = sp.getString(KEY_BACKUP_KEY, null)

    fun setServerUrl(url: String) {
        val clean = url.trim().trimEnd('/')
        sp.edit().putString(KEY_URL, clean).apply()
        _serverUrl.value = clean
    }

    var lastBackupAt: Long
        get() = sp.getLong(KEY_LAST_BACKUP, 0L)
        set(v) = sp.edit().putLong(KEY_LAST_BACKUP, v).apply()

    companion object {
        /** 에뮬레이터에서 PC 의 localhost:8080 서버에 접속하는 주소 */
        const val DEFAULT_URL = "http://10.0.2.2:8080"
        private const val KEY_ID = "user_id"
        private const val KEY_EMAIL = "email"
        private const val KEY_NICK = "nickname"
        private const val KEY_TOKEN = "token"
        private const val KEY_BACKUP_KEY = "backup_key"
        private const val KEY_URL = "server_url"
        private const val KEY_LAST_BACKUP = "last_backup"
    }
}
