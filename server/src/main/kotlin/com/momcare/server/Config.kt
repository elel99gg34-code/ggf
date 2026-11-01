package com.momcare.server

import java.net.URI
import java.security.SecureRandom
import java.util.Base64

/** 환경 변수 기반 서버 설정 */
data class AppConfig(
    val port: Int,
    val jdbcUrl: String,
    val dbUser: String?,
    val dbPassword: String?,
    val jwtSecret: String,
    val jwtIssuer: String = "momcare",
    val jwtAudience: String = "momcare-app",
    val tokenDays: Long = 30,
    val maxBackupBytes: Long,
    val production: Boolean
) {
    companion object {
        fun fromEnv(env: Map<String, String> = System.getenv()): AppConfig {
            val production = env["APP_ENV"].equals("production", ignoreCase = true)
            val secret = env["JWT_SECRET"]?.takeIf { it.length >= 32 }
                ?: if (production) {
                    error("운영 환경에서는 32자 이상의 JWT_SECRET 환경 변수가 필요합니다.")
                } else {
                    System.err.println("[경고] JWT_SECRET 이 없어 임시 키를 사용합니다. 서버를 재시작하면 모든 로그인이 만료됩니다.")
                    randomSecret()
                }
            val (url, user, pass) = parseDatabaseUrl(env["DATABASE_URL"], env["DB_USER"], env["DB_PASSWORD"])
            return AppConfig(
                port = env["PORT"]?.toIntOrNull() ?: 8080,
                jdbcUrl = url,
                dbUser = user,
                dbPassword = pass,
                jwtSecret = secret,
                maxBackupBytes = (env["MAX_BACKUP_MB"]?.toLongOrNull() ?: 25L) * 1024 * 1024,
                production = production
            )
        }

        private fun decode(s: String): String = java.net.URLDecoder.decode(s, Charsets.UTF_8)

        fun randomSecret(): String =
            Base64.getEncoder().encodeToString(ByteArray(48).also { SecureRandom().nextBytes(it) })

        /**
         * 지원 형식
         * - 없음 → jdbc:sqlite:data/momcare.db
         * - jdbc:... → 그대로 사용
         * - postgres://user:pass@host:port/db (Render/Heroku 형식) → JDBC 로 변환
         */
        fun parseDatabaseUrl(raw: String?, user: String?, pass: String?): Triple<String, String?, String?> {
            if (raw.isNullOrBlank()) {
                java.io.File("data").mkdirs()
                return Triple("jdbc:sqlite:data/momcare.db", null, null)
            }
            if (raw.startsWith("jdbc:")) return Triple(raw, user, pass)
            if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
                val uri = URI(raw)
                val info = uri.userInfo?.split(":", limit = 2)
                val port = if (uri.port > 0) uri.port else 5432
                val query = uri.query?.let { "?$it" } ?: ""
                return Triple(
                    "jdbc:postgresql://${uri.host}:$port${uri.path}$query",
                    info?.getOrNull(0)?.let { decode(it) } ?: user,
                    info?.getOrNull(1)?.let { decode(it) } ?: pass
                )
            }
            error("지원하지 않는 DATABASE_URL 형식입니다.")
        }
    }
}
