package com.momcare.app.data.remote

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.net.UnknownHostException

/** 서버 오류를 사용자에게 보여줄 한국어 메시지와 함께 표현 */
class ApiException(val status: Int, override val message: String) : Exception(message)

data class BackupInfo(val updatedAt: Long, val size: Long)

/**
 * 맘케어 서버 REST 클라이언트.
 * 추가 라이브러리 없이 HttpURLConnection + org.json 만 사용한다.
 */
class ApiClient(private val baseUrl: () -> String) {

    // ───────── 인증 ─────────

    suspend fun signup(email: String, password: String, nickname: String): Session {
        val body = JSONObject().put("email", email).put("password", password).put("nickname", nickname)
        return parseAuth(request("POST", "/api/auth/signup", json = body))
    }

    suspend fun login(email: String, password: String): Session {
        val body = JSONObject().put("email", email).put("password", password)
        return parseAuth(request("POST", "/api/auth/login", json = body))
    }

    suspend fun me(token: String): Session {
        val obj = JSONObject(String(request("GET", "/api/me", token = token)))
        return Session(obj.getLong("id"), obj.getString("email"), obj.getString("nickname"), token)
    }

    suspend fun changePassword(token: String, current: String, next: String) {
        val body = JSONObject().put("currentPassword", current).put("newPassword", next)
        request("POST", "/api/auth/password", json = body, token = token)
    }

    suspend fun deleteAccount(token: String, password: String) {
        val body = JSONObject().put("password", password)
        request("POST", "/api/account/delete", json = body, token = token)
    }

    // ───────── 백업 ─────────

    suspend fun uploadBackup(token: String, encrypted: ByteArray): BackupInfo {
        val obj = JSONObject(String(request("PUT", "/api/backup", token = token, binary = encrypted)))
        return BackupInfo(obj.getLong("updatedAt"), obj.getLong("size"))
    }

    suspend fun backupInfo(token: String): BackupInfo? = try {
        val obj = JSONObject(String(request("GET", "/api/backup/info", token = token)))
        BackupInfo(obj.getLong("updatedAt"), obj.getLong("size"))
    } catch (e: ApiException) {
        if (e.status == 404) null else throw e
    }

    suspend fun downloadBackup(token: String): ByteArray = request("GET", "/api/backup", token = token)

    suspend fun health(): Boolean = try {
        request("GET", "/health"); true
    } catch (e: Exception) {
        false
    }

    // ───────── 내부 ─────────

    private fun parseAuth(bytes: ByteArray): Session {
        val obj = JSONObject(String(bytes))
        val user = obj.getJSONObject("user")
        return Session(user.getLong("id"), user.getString("email"), user.getString("nickname"), obj.getString("token"))
    }

    private suspend fun request(
        method: String,
        path: String,
        json: JSONObject? = null,
        binary: ByteArray? = null,
        token: String? = null
    ): ByteArray = withContext(Dispatchers.IO) {
        val conn = try {
            URL(baseUrl() + path).openConnection() as HttpURLConnection
        } catch (e: Exception) {
            throw ApiException(0, "서버 주소가 올바르지 않아요. 설정에서 주소를 확인해주세요.")
        }
        try {
            conn.requestMethod = method
            conn.connectTimeout = 10_000
            conn.readTimeout = 30_000
            conn.setRequestProperty("Accept", "application/json")
            if (token != null) conn.setRequestProperty("Authorization", "Bearer $token")
            when {
                json != null -> {
                    conn.doOutput = true
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    conn.outputStream.use { it.write(json.toString().toByteArray()) }
                }
                binary != null -> {
                    conn.doOutput = true
                    conn.setRequestProperty("Content-Type", "application/octet-stream")
                    conn.setFixedLengthStreamingMode(binary.size)
                    conn.outputStream.use { it.write(binary) }
                }
            }
            val code = conn.responseCode
            if (code in 200..299) {
                conn.inputStream.use { it.readBytes() }
            } else {
                val err = conn.errorStream?.use { String(it.readBytes()) }.orEmpty()
                val msg = runCatching { JSONObject(err).getString("error") }.getOrNull()
                throw ApiException(code, msg ?: defaultMessage(code))
            }
        } catch (e: ApiException) {
            throw e
        } catch (e: UnknownHostException) {
            throw ApiException(0, "서버를 찾을 수 없어요. 인터넷 연결과 서버 주소를 확인해주세요.")
        } catch (e: SocketTimeoutException) {
            throw ApiException(0, "서버 응답이 늦어요. 잠시 후 다시 시도해주세요.")
        } catch (e: IOException) {
            throw ApiException(0, "서버에 연결할 수 없어요. (${e.javaClass.simpleName})")
        } finally {
            conn.disconnect()
        }
    }

    private fun defaultMessage(code: Int) = when (code) {
        400 -> "입력값을 확인해주세요."
        401 -> "로그인이 필요해요. 다시 로그인해주세요."
        403 -> "권한이 없어요."
        404 -> "데이터가 없어요."
        409 -> "이미 가입된 이메일이에요."
        413 -> "백업 파일이 너무 커요."
        429 -> "시도가 너무 많아요. 잠시 후 다시 시도해주세요."
        else -> "서버 오류가 발생했어요. ($code)"
    }
}
