package com.momcare.server

import com.auth0.jwt.JWT
import com.auth0.jwt.JWTVerifier
import com.auth0.jwt.algorithms.Algorithm
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import java.util.Date
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/**
 * 비밀번호 해시: PBKDF2-HMAC-SHA256
 * 저장 형식: pbkdf2$반복횟수$솔트(base64)$해시(base64)
 */
object PasswordHasher {
    private const val ITERATIONS = 210_000
    private const val KEY_BITS = 256
    private val random = SecureRandom()

    fun hash(password: String, iterations: Int = ITERATIONS): String {
        val salt = ByteArray(16).also { random.nextBytes(it) }
        val h = derive(password, salt, iterations)
        val enc = Base64.getEncoder()
        return "pbkdf2$$iterations$${enc.encodeToString(salt)}$${enc.encodeToString(h)}"
    }

    fun verify(password: String, stored: String): Boolean {
        val parts = stored.split("$")
        if (parts.size != 4 || parts[0] != "pbkdf2") return false
        val iterations = parts[1].toIntOrNull() ?: return false
        val dec = Base64.getDecoder()
        val salt = dec.decode(parts[2])
        val expected = dec.decode(parts[3])
        // 상수 시간 비교로 타이밍 공격 방지
        return MessageDigest.isEqual(expected, derive(password, salt, iterations))
    }

    /** 존재하지 않는 계정 로그인 시에도 같은 시간이 걸리도록 하는 더미 해시 */
    val dummyHash: String by lazy { hash("momcare-dummy-password") }

    private fun derive(password: String, salt: ByteArray, iterations: Int): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, iterations, KEY_BITS)
        return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
    }
}

/** JWT 발급·검증 */
class JwtService(private val config: AppConfig) {
    private val algorithm = Algorithm.HMAC256(config.jwtSecret)

    val verifier: JWTVerifier = JWT.require(algorithm)
        .withIssuer(config.jwtIssuer)
        .withAudience(config.jwtAudience)
        .build()

    fun issue(user: UserRecord): String = JWT.create()
        .withIssuer(config.jwtIssuer)
        .withAudience(config.jwtAudience)
        .withSubject(user.id.toString())
        .withClaim("uid", user.id)
        .withClaim("ver", user.tokenVersion)
        .withIssuedAt(Date())
        .withExpiresAt(Date(System.currentTimeMillis() + config.tokenDays * 24 * 60 * 60 * 1000))
        .sign(algorithm)
}

/**
 * 간단한 메모리 기반 시도 횟수 제한기 (무차별 대입 방지).
 * 서버 1대 기준이며, 여러 대로 확장할 때는 Redis 등으로 바꾼다.
 */
class RateLimiter(private val maxAttempts: Int, private val windowMs: Long, private val clock: () -> Long = System::currentTimeMillis) {
    private val hits = ConcurrentHashMap<String, MutableList<Long>>()

    /** 허용되면 true 를 반환하고 기록한다 */
    fun tryAcquire(key: String): Boolean {
        val now = clock()
        val list = hits.computeIfAbsent(key) { mutableListOf() }
        synchronized(list) {
            list.removeAll { it < now - windowMs }
            if (list.size >= maxAttempts) return false
            list.add(now)
            return true
        }
    }

    fun reset(key: String) {
        hits.remove(key)
    }
}

object Validation {
    private val EMAIL = Regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")

    fun normalizeEmail(email: String) = email.trim().lowercase()

    fun emailError(email: String): String? =
        if (email.length > 254 || !EMAIL.matches(email)) "이메일 형식이 올바르지 않아요." else null

    fun passwordError(pw: String): String? = when {
        pw.length < 8 -> "비밀번호는 8자 이상이어야 해요."
        pw.length > 128 -> "비밀번호가 너무 길어요."
        pw.none { it.isDigit() } || pw.none { it.isLetter() } -> "비밀번호에 영문과 숫자를 함께 사용해주세요."
        else -> null
    }

    fun nicknameError(n: String): String? =
        if (n.trim().length !in 1..20) "닉네임은 1~20자로 입력해주세요." else null
}
