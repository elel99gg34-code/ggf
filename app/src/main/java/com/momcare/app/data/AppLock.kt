package com.momcare.app.data

import java.security.MessageDigest

/**
 * 가족 전용 앱 잠금.
 * 비밀번호는 평문으로 저장하지 않고 솔트가 붙은 SHA-256 해시만 보관한다.
 * 한 번 올바르게 입력하면 [Prefs.unlocked] 가 true 로 저장되어 이후 잠금 화면이 나타나지 않는다.
 *
 * 참고: 이 장치는 가족 외 사람이 앱을 열어보는 것을 막는 "문 잠금" 수준이며,
 * 기기 자체가 탈취·분석되는 상황까지 막는 강한 보안은 아니다.
 */
object AppLock {
    private const val SALT = "momcare-family-v1:"
    private const val EXPECTED_HASH = "4542733281ac45d2c5b54e7e3db51867c2507414931f081519119c2a2a9cb1fd"

    fun verify(input: String): Boolean = hash(input.trim()) == EXPECTED_HASH

    private fun hash(text: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest((SALT + text).toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
