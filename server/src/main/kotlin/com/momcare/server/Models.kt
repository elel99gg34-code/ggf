package com.momcare.server

import io.ktor.http.HttpStatusCode
import kotlinx.serialization.Serializable

@Serializable
data class SignupRequest(val email: String, val password: String, val nickname: String)

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class ChangePasswordRequest(val currentPassword: String, val newPassword: String)

@Serializable
data class DeleteAccountRequest(val password: String)

@Serializable
data class UserDto(val id: Long, val email: String, val nickname: String, val createdAt: Long)

@Serializable
data class AuthResponse(val token: String, val user: UserDto)

@Serializable
data class BackupInfoDto(val updatedAt: Long, val size: Long)

@Serializable
data class ErrorResponse(val error: String)

@Serializable
data class HealthResponse(val status: String, val version: String)

/** 사용자에게 그대로 보여줄 수 있는 오류 */
class ApiError(val status: HttpStatusCode, override val message: String) : RuntimeException(message)

fun UserRecord.toDto() = UserDto(id, email, nickname, createdAt)
