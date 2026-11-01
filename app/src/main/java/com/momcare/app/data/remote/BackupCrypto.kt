package com.momcare.app.data.remote

import android.util.Base64
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * 백업 암호화.
 * - 키: PBKDF2-HMAC-SHA256(비밀번호, "momcare-backup:" + 이메일, 120,000회) → 256bit
 * - 암호: AES-256-GCM, 파일 형식 = MAGIC(4) + IV(12) + 암호문(+태그)
 * 서버에는 암호문만 저장되므로 서버 관리자도 내용을 볼 수 없다.
 * 비밀번호를 바꾸면 기존 백업은 이전 비밀번호로만 복호화할 수 있으므로, 변경 직후 새로 백업한다.
 */
object BackupCrypto {
    private val MAGIC = byteArrayOf('M'.code.toByte(), 'C'.code.toByte(), 'B'.code.toByte(), 1)
    private const val ITERATIONS = 120_000
    private const val IV_LEN = 12
    private const val TAG_BITS = 128

    fun deriveKey(email: String, password: String): ByteArray {
        val salt = ("momcare-backup:" + email.trim().lowercase()).toByteArray()
        val spec = PBEKeySpec(password.toCharArray(), salt, ITERATIONS, 256)
        return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
    }

    fun keyToString(key: ByteArray): String = Base64.encodeToString(key, Base64.NO_WRAP)
    fun keyFromString(s: String): ByteArray = Base64.decode(s, Base64.NO_WRAP)

    fun encrypt(key: ByteArray, plain: ByteArray): ByteArray {
        val iv = ByteArray(IV_LEN).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG_BITS, iv))
        return MAGIC + iv + cipher.doFinal(plain)
    }

    fun decrypt(key: ByteArray, data: ByteArray): ByteArray {
        require(data.size > MAGIC.size + IV_LEN && data.copyOfRange(0, MAGIC.size).contentEquals(MAGIC)) {
            "맘케어 백업 파일이 아니에요."
        }
        val iv = data.copyOfRange(MAGIC.size, MAGIC.size + IV_LEN)
        val body = data.copyOfRange(MAGIC.size + IV_LEN, data.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG_BITS, iv))
        return try {
            cipher.doFinal(body)
        } catch (e: Exception) {
            throw IllegalStateException("백업을 열 수 없어요. 백업할 때와 같은 계정·비밀번호인지 확인해주세요.")
        }
    }
}
