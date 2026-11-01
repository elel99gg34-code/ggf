package com.momcare.server

import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.client.statement.readBytes
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class ServerTest {

    private fun testConfig(maxBytes: Long = 1024 * 1024): AppConfig {
        val file = File.createTempFile("momcare-test", ".db").apply { deleteOnExit() }
        return AppConfig(
            port = 0,
            jdbcUrl = "jdbc:sqlite:${file.absolutePath}",
            dbUser = null, dbPassword = null,
            jwtSecret = AppConfig.randomSecret(),
            maxBackupBytes = maxBytes,
            production = false
        )
    }

    private fun withServer(maxBytes: Long = 1024 * 1024, block: suspend ApplicationTestBuilder.() -> Unit) =
        testApplication {
            application { module(testConfig(maxBytes)) }
            block()
        }

    private suspend fun HttpClient.signup(email: String = "mom@example.com", pw: String = "secret123", nick: String = "하늘맘"): HttpResponse =
        post("/api/auth/signup") {
            contentType(ContentType.Application.Json)
            setBody("""{"email":"$email","password":"$pw","nickname":"$nick"}""")
        }

    private suspend fun HttpClient.login(email: String, pw: String): HttpResponse =
        post("/api/auth/login") {
            contentType(ContentType.Application.Json)
            setBody("""{"email":"$email","password":"$pw"}""")
        }

    private suspend fun HttpResponse.token(): String =
        Json.parseToJsonElement(bodyAsText()).jsonObject["token"]!!.jsonPrimitive.content

    private suspend fun HttpResponse.error(): String =
        Json.parseToJsonElement(bodyAsText()).jsonObject["error"]!!.jsonPrimitive.content

    @Test
    fun healthCheck() = withServer {
        val res = client.get("/health")
        assertEquals(HttpStatusCode.OK, res.status)
        assertTrue(res.bodyAsText().contains("ok"))
    }

    @Test
    fun signupAndLogin() = withServer {
        val res = client.signup()
        assertEquals(HttpStatusCode.Created, res.status)
        assertTrue(res.bodyAsText().contains("하늘맘"))

        // 이메일 대소문자·공백은 정규화된다
        val login = client.login("  MOM@example.com ", "secret123")
        assertEquals(HttpStatusCode.OK, login.status)

        val wrong = client.login("mom@example.com", "wrongpass1")
        assertEquals(HttpStatusCode.Unauthorized, wrong.status)
        assertEquals("이메일 또는 비밀번호가 맞지 않아요.", wrong.error())

        val unknown = client.login("nobody@example.com", "secret123")
        assertEquals(HttpStatusCode.Unauthorized, unknown.status)
    }

    @Test
    fun signupValidation() = withServer {
        assertEquals(HttpStatusCode.Created, client.signup().status)
        assertEquals(HttpStatusCode.Conflict, client.signup().status)
        assertEquals(HttpStatusCode.BadRequest, client.signup(email = "not-an-email").status)
        assertEquals(HttpStatusCode.BadRequest, client.signup(email = "a@b.com", pw = "short1").status)
        assertEquals(HttpStatusCode.BadRequest, client.signup(email = "a@b.com", pw = "onlyletters").status)
        assertEquals(HttpStatusCode.BadRequest, client.signup(email = "a@b.com", nick = "").status)
        val bad = client.post("/api/auth/signup") {
            contentType(ContentType.Application.Json); setBody("{broken")
        }
        assertEquals(HttpStatusCode.BadRequest, bad.status)
    }

    @Test
    fun meRequiresToken() = withServer {
        assertEquals(HttpStatusCode.Unauthorized, client.get("/api/me").status)
        assertEquals(HttpStatusCode.Unauthorized, client.get("/api/me") { header(HttpHeaders.Authorization, "Bearer garbage") }.status)
        val token = client.signup().token()
        val me = client.get("/api/me") { header(HttpHeaders.Authorization, "Bearer $token") }
        assertEquals(HttpStatusCode.OK, me.status)
        assertTrue(me.bodyAsText().contains("mom@example.com"))
        assertFalse(me.bodyAsText().contains("password"))
    }

    @Test
    fun backupRoundTrip() = withServer {
        val token = client.signup().token()
        val auth: io.ktor.client.request.HttpRequestBuilder.() -> Unit = { header(HttpHeaders.Authorization, "Bearer $token") }

        assertEquals(HttpStatusCode.NotFound, client.get("/api/backup/info", auth).status)
        assertEquals(HttpStatusCode.NotFound, client.get("/api/backup", auth).status)

        val payload = ByteArray(50_000) { (it % 251).toByte() }
        val put = client.put("/api/backup") {
            auth(); contentType(ContentType.Application.OctetStream); setBody(payload)
        }
        assertEquals(HttpStatusCode.OK, put.status)
        assertTrue(put.bodyAsText().contains("\"size\":50000"))

        val got = client.get("/api/backup", auth)
        assertEquals(HttpStatusCode.OK, got.status)
        assertContentEquals(payload, got.readBytes())

        // 덮어쓰기
        val second = byteArrayOf(1, 2, 3)
        client.put("/api/backup") { auth(); contentType(ContentType.Application.OctetStream); setBody(second) }
        assertContentEquals(second, client.get("/api/backup", auth).readBytes())
        assertTrue(client.get("/api/backup/info", auth).bodyAsText().contains("\"size\":3"))
    }

    @Test
    fun backupsAreIsolatedPerUser() = withServer {
        val a = client.signup("a@example.com").token()
        val b = client.signup("b@example.com").token()
        client.put("/api/backup") {
            header(HttpHeaders.Authorization, "Bearer $a"); contentType(ContentType.Application.OctetStream); setBody(byteArrayOf(9, 9))
        }
        val res = client.get("/api/backup") { header(HttpHeaders.Authorization, "Bearer $b") }
        assertEquals(HttpStatusCode.NotFound, res.status)
    }

    @Test
    fun backupSizeLimit() = withServer(maxBytes = 1000) {
        val token = client.signup().token()
        val res = client.put("/api/backup") {
            header(HttpHeaders.Authorization, "Bearer $token")
            contentType(ContentType.Application.OctetStream)
            setBody(ByteArray(2000))
        }
        assertEquals(HttpStatusCode.PayloadTooLarge, res.status)
    }

    @Test
    fun passwordChangeRevokesOldTokens() = withServer {
        val oldToken = client.signup().token()
        val change = client.post("/api/auth/password") {
            header(HttpHeaders.Authorization, "Bearer $oldToken")
            contentType(ContentType.Application.Json)
            setBody("""{"currentPassword":"secret123","newPassword":"newpass456"}""")
        }
        assertEquals(HttpStatusCode.OK, change.status)
        val newToken = change.token()
        assertNotEquals(oldToken, newToken)

        assertEquals(HttpStatusCode.Unauthorized, client.get("/api/me") { header(HttpHeaders.Authorization, "Bearer $oldToken") }.status)
        assertEquals(HttpStatusCode.OK, client.get("/api/me") { header(HttpHeaders.Authorization, "Bearer $newToken") }.status)
        assertEquals(HttpStatusCode.Unauthorized, client.login("mom@example.com", "secret123").status)
        assertEquals(HttpStatusCode.OK, client.login("mom@example.com", "newpass456").status)
    }

    @Test
    fun deleteAccount() = withServer {
        val token = client.signup().token()
        client.put("/api/backup") {
            header(HttpHeaders.Authorization, "Bearer $token"); contentType(ContentType.Application.OctetStream); setBody(byteArrayOf(1))
        }
        val wrong = client.post("/api/account/delete") {
            header(HttpHeaders.Authorization, "Bearer $token"); contentType(ContentType.Application.Json); setBody("""{"password":"nope12345"}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, wrong.status)
        val ok = client.post("/api/account/delete") {
            header(HttpHeaders.Authorization, "Bearer $token"); contentType(ContentType.Application.Json); setBody("""{"password":"secret123"}""")
        }
        assertEquals(HttpStatusCode.OK, ok.status)
        assertEquals(HttpStatusCode.Unauthorized, client.get("/api/me") { header(HttpHeaders.Authorization, "Bearer $token") }.status)
        assertEquals(HttpStatusCode.Unauthorized, client.login("mom@example.com", "secret123").status)
        // 같은 이메일로 다시 가입 가능
        assertEquals(HttpStatusCode.Created, client.signup().status)
    }

    @Test
    fun loginRateLimit() = withServer {
        client.signup()
        repeat(10) { assertEquals(HttpStatusCode.Unauthorized, client.login("mom@example.com", "wrongpass1").status) }
        assertEquals(HttpStatusCode.TooManyRequests, client.login("mom@example.com", "secret123").status)
    }
}

class UnitTest {
    @Test
    fun passwordHashing() {
        val h = PasswordHasher.hash("secret123", iterations = 1000)
        assertTrue(h.startsWith("pbkdf2$1000$"))
        assertTrue(PasswordHasher.verify("secret123", h))
        assertFalse(PasswordHasher.verify("secret124", h))
        assertFalse(PasswordHasher.verify("secret123", "garbage"))
        assertNotEquals(h, PasswordHasher.hash("secret123", iterations = 1000), "솔트가 매번 달라야 함")
    }

    @Test
    fun rateLimiterWindow() {
        var now = 0L
        val limiter = RateLimiter(2, 1000) { now }
        assertTrue(limiter.tryAcquire("k"))
        assertTrue(limiter.tryAcquire("k"))
        assertFalse(limiter.tryAcquire("k"))
        assertTrue(limiter.tryAcquire("other"))
        now = 1500
        assertTrue(limiter.tryAcquire("k"))
    }

    @Test
    fun databaseUrlParsing() {
        val (url, user, pass) = AppConfig.parseDatabaseUrl("postgres://u1:p%40ss@db.example.com:6543/momcare", null, null)
        assertEquals("jdbc:postgresql://db.example.com:6543/momcare", url)
        assertEquals("u1", user)
        assertEquals("p@ss", pass)
        assertEquals("jdbc:sqlite:x.db", AppConfig.parseDatabaseUrl("jdbc:sqlite:x.db", null, null).first)
    }

    @Test
    fun productionRequiresSecret() {
        val r = runCatching { AppConfig.fromEnv(mapOf("APP_ENV" to "production")) }
        assertTrue(r.isFailure)
        val ok = AppConfig.fromEnv(mapOf("APP_ENV" to "production", "JWT_SECRET" to "x".repeat(40), "DATABASE_URL" to "jdbc:sqlite:x.db"))
        assertTrue(ok.production)
    }
}
