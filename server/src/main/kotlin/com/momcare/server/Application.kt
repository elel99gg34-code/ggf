package com.momcare.server

import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.Principal
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.jwt
import io.ktor.server.auth.principal
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.callloging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.defaultheaders.DefaultHeaders
import io.ktor.server.plugins.origin
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.request.header
import io.ktor.server.request.receive
import io.ktor.server.request.receiveChannel
import io.ktor.server.response.respond
import io.ktor.server.response.respondBytes
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.utils.io.core.readBytes
import io.ktor.utils.io.readRemaining
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory

private val log = LoggerFactory.getLogger("MomCareServer")

/** 인증된 사용자 */
data class UserPrincipal(val id: Long, val email: String) : Principal

fun main() {
    val config = AppConfig.fromEnv()
    log.info("맘케어 서버 시작: port=${config.port}, db=${config.jdbcUrl.substringBefore("?")}")
    embeddedServer(Netty, port = config.port, host = "0.0.0.0") { module(config) }.start(wait = true)
}

fun Application.module(config: AppConfig = AppConfig.fromEnv()) {
    val db = DatabaseFactory.init(config)
    val repo = Repository(db)
    val jwt = JwtService(config)
    // 로그인: 15분에 10회, 회원가입: 1시간에 20회 (IP 기준)
    val loginLimiter = RateLimiter(10, 15 * 60_000L)
    val signupLimiter = RateLimiter(20, 60 * 60_000L)

    install(DefaultHeaders) {
        header("X-Content-Type-Options", "nosniff")
        header("Cache-Control", "no-store")
    }
    install(CallLogging)
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; encodeDefaults = true })
    }
    install(StatusPages) {
        exception<ApiError> { call, e -> call.respond(e.status, ErrorResponse(e.message)) }
        exception<BadRequestException> { call, _ ->
            call.respond(HttpStatusCode.BadRequest, ErrorResponse("요청 형식이 올바르지 않아요."))
        }
        exception<Throwable> { call, e ->
            log.error("처리되지 않은 오류", e)
            call.respond(HttpStatusCode.InternalServerError, ErrorResponse("서버 오류가 발생했어요."))
        }
    }
    install(Authentication) {
        jwt("auth-jwt") {
            realm = "momcare"
            verifier(jwt.verifier)
            validate { credential ->
                val uid = credential.payload.getClaim("uid").asLong() ?: return@validate null
                val ver = credential.payload.getClaim("ver").asInt() ?: return@validate null
                val user = repo.findById(uid) ?: return@validate null
                // 비밀번호를 바꾸면 이전 토큰은 더 이상 쓸 수 없다
                if (user.tokenVersion != ver) null else UserPrincipal(user.id, user.email)
            }
            challenge { _, _ ->
                call.respond(HttpStatusCode.Unauthorized, ErrorResponse("로그인이 필요해요. 다시 로그인해주세요."))
            }
        }
    }

    routing {
        get("/health") { call.respond(HealthResponse("ok", "1.0.0")) }

        route("/api") {
            authRoutes(repo, jwt, loginLimiter, signupLimiter)
            authenticate("auth-jwt") {
                accountRoutes(repo, jwt, loginLimiter)
                backupRoutes(repo, config)
            }
        }
    }
}

private fun ApplicationCall.clientIp(): String =
    request.header("X-Forwarded-For")?.substringBefore(",")?.trim()?.takeIf { it.isNotEmpty() }
        ?: request.origin.remoteHost

private fun ApplicationCall.user(): UserPrincipal =
    principal<UserPrincipal>() ?: throw ApiError(HttpStatusCode.Unauthorized, "로그인이 필요해요.")

// ───────────────────── 회원가입·로그인 ─────────────────────

private fun Route.authRoutes(repo: Repository, jwt: JwtService, loginLimiter: RateLimiter, signupLimiter: RateLimiter) {
    post("/auth/signup") {
        if (!signupLimiter.tryAcquire(call.clientIp())) {
            throw ApiError(HttpStatusCode.TooManyRequests, "가입 시도가 너무 많아요. 잠시 후 다시 시도해주세요.")
        }
        val req = call.receive<SignupRequest>()
        val email = Validation.normalizeEmail(req.email)
        Validation.emailError(email)?.let { throw ApiError(HttpStatusCode.BadRequest, it) }
        Validation.passwordError(req.password)?.let { throw ApiError(HttpStatusCode.BadRequest, it) }
        Validation.nicknameError(req.nickname)?.let { throw ApiError(HttpStatusCode.BadRequest, it) }

        val user = repo.createUser(email, req.nickname.trim(), PasswordHasher.hash(req.password))
            ?: throw ApiError(HttpStatusCode.Conflict, "이미 가입된 이메일이에요.")
        log.info("회원가입 id=${user.id}")
        call.respond(HttpStatusCode.Created, AuthResponse(jwt.issue(user), user.toDto()))
    }

    post("/auth/login") {
        val req = call.receive<LoginRequest>()
        val email = Validation.normalizeEmail(req.email)
        val key = "${call.clientIp()}|$email"
        if (!loginLimiter.tryAcquire(key)) {
            throw ApiError(HttpStatusCode.TooManyRequests, "로그인 시도가 너무 많아요. 15분 후 다시 시도해주세요.")
        }
        val user = repo.findByEmail(email)
        // 계정이 없어도 같은 시간이 걸리도록 더미 해시를 검증한다
        val ok = PasswordHasher.verify(req.password, user?.passwordHash ?: PasswordHasher.dummyHash) && user != null
        if (!ok || user == null) {
            throw ApiError(HttpStatusCode.Unauthorized, "이메일 또는 비밀번호가 맞지 않아요.")
        }
        loginLimiter.reset(key)
        call.respond(AuthResponse(jwt.issue(user), user.toDto()))
    }
}

// ───────────────────── 계정 ─────────────────────

private fun Route.accountRoutes(repo: Repository, jwt: JwtService, limiter: RateLimiter) {
    get("/me") {
        val u = repo.findById(call.user().id) ?: throw ApiError(HttpStatusCode.Unauthorized, "계정을 찾을 수 없어요.")
        call.respond(u.toDto())
    }

    post("/auth/password") {
        val principal = call.user()
        if (!limiter.tryAcquire("pw|${principal.id}")) {
            throw ApiError(HttpStatusCode.TooManyRequests, "시도가 너무 많아요. 잠시 후 다시 시도해주세요.")
        }
        val req = call.receive<ChangePasswordRequest>()
        val user = repo.findById(principal.id) ?: throw ApiError(HttpStatusCode.Unauthorized, "계정을 찾을 수 없어요.")
        if (!PasswordHasher.verify(req.currentPassword, user.passwordHash)) {
            throw ApiError(HttpStatusCode.Unauthorized, "현재 비밀번호가 맞지 않아요.")
        }
        Validation.passwordError(req.newPassword)?.let { throw ApiError(HttpStatusCode.BadRequest, it) }
        val newVersion = repo.updatePassword(user.id, PasswordHasher.hash(req.newPassword))
        val updated = user.copy(tokenVersion = newVersion)
        call.respond(AuthResponse(jwt.issue(updated), updated.toDto()))
    }

    post("/account/delete") {
        val principal = call.user()
        val req = call.receive<DeleteAccountRequest>()
        val user = repo.findById(principal.id) ?: throw ApiError(HttpStatusCode.Unauthorized, "계정을 찾을 수 없어요.")
        if (!PasswordHasher.verify(req.password, user.passwordHash)) {
            throw ApiError(HttpStatusCode.Unauthorized, "비밀번호가 맞지 않아요.")
        }
        repo.deleteUser(user.id)
        log.info("계정 삭제 id=${user.id}")
        call.respond(HttpStatusCode.OK, mapOf("deleted" to true))
    }
}

// ───────────────────── 백업 ─────────────────────

private fun Route.backupRoutes(repo: Repository, config: AppConfig) {
    put("/backup") {
        val uid = call.user().id
        val declared = call.request.header(HttpHeaders.ContentLength)?.toLongOrNull()
        if (declared != null && declared > config.maxBackupBytes) {
            throw ApiError(HttpStatusCode.PayloadTooLarge, "백업 파일이 너무 커요. (최대 ${config.maxBackupBytes / 1024 / 1024}MB)")
        }
        // 선언된 길이와 무관하게 최대 크기 + 1 바이트까지만 읽어서 초과 여부를 판단
        val bytes = call.receiveChannel().readRemaining(config.maxBackupBytes + 1).readBytes()
        if (bytes.size > config.maxBackupBytes) {
            throw ApiError(HttpStatusCode.PayloadTooLarge, "백업 파일이 너무 커요.")
        }
        if (bytes.isEmpty()) throw ApiError(HttpStatusCode.BadRequest, "백업 데이터가 비어 있어요.")
        val meta = repo.saveBackup(uid, bytes)
        call.respond(BackupInfoDto(meta.updatedAt, meta.size))
    }

    get("/backup/info") {
        val meta = repo.backupMeta(call.user().id) ?: throw ApiError(HttpStatusCode.NotFound, "저장된 백업이 없어요.")
        call.respond(BackupInfoDto(meta.updatedAt, meta.size))
    }

    get("/backup") {
        val bytes = repo.loadBackup(call.user().id) ?: throw ApiError(HttpStatusCode.NotFound, "저장된 백업이 없어요.")
        call.respondBytes(bytes, ContentType.Application.OctetStream)
    }
}
