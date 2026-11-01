package com.momcare.app.ui.screens

import android.app.Application
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.momcare.app.data.remote.ApiException
import com.momcare.app.data.remote.BackupCrypto
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.InfoBanner
import com.momcare.app.ui.components.MomScaffold
import com.momcare.app.ui.components.PrimaryAction
import com.momcare.app.ui.components.ScrollScreen
import com.momcare.app.ui.nav.Routes
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** 로그인·회원가입 상태 */
data class AuthUiState(val loading: Boolean = false, val error: String? = null, val done: Boolean = false)

class AuthViewModel(app: Application) : BaseViewModel(app) {
    private val _state = MutableStateFlow(AuthUiState())
    val state = _state.asStateFlow()
    val serverUrl = container.session.serverUrl

    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun login(email: String, password: String) = authenticate(email, password) {
        container.api.login(email.trim(), password)
    }

    fun signup(email: String, password: String, nickname: String) = authenticate(email, password) {
        container.api.signup(email.trim(), password, nickname.trim())
    }

    private fun authenticate(email: String, password: String, call: suspend () -> com.momcare.app.data.remote.Session) {
        if (_state.value.loading) return
        _state.value = AuthUiState(loading = true)
        viewModelScope.launch {
            try {
                val session = call()
                // 백업 암호화 키는 비밀번호에서 기기 안에서만 만든다 (서버로 전송하지 않음)
                val key = withContext(Dispatchers.Default) { BackupCrypto.deriveKey(email, password) }
                container.session.save(session, BackupCrypto.keyToString(key))
                if (session.nickname.isNotBlank()) prefs.setMomName(session.nickname)
                _state.value = AuthUiState(done = true)
            } catch (e: ApiException) {
                _state.value = AuthUiState(error = e.message)
            } catch (e: Exception) {
                _state.value = AuthUiState(error = "알 수 없는 오류가 발생했어요: ${e.message}")
            }
        }
    }
}

object AuthValidation {
    private val EMAIL = Regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")

    fun emailError(email: String): String? =
        if (email.isBlank() || EMAIL.matches(email.trim())) null else "이메일 형식이 올바르지 않아요"

    fun passwordError(pw: String): String? = when {
        pw.isEmpty() -> null
        pw.length < 8 -> "8자 이상 입력해주세요"
        pw.none { it.isDigit() } || pw.none { it.isLetter() } -> "영문과 숫자를 함께 사용해주세요"
        else -> null
    }

    fun nicknameError(n: String): String? =
        if (n.isNotEmpty() && (n.trim().length !in 1..20)) "1~20자로 입력해주세요" else null
}

@Composable
fun LoginScreen(nav: NavController, vm: AuthViewModel = viewModel()) {
    val state by vm.state.collectAsState()
    val server by vm.serverUrl.collectAsState()
    var email by remember { mutableStateOf("") }
    var pw by remember { mutableStateOf("") }

    LaunchedEffect(state.done) { if (state.done) nav.popBackStack(Routes.HOME, false) }

    MomScaffold("로그인", nav) { padding ->
        ScrollScreen(padding) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("☁️", fontSize = 56.sp)
                Text("맘케어 계정", style = MaterialTheme.typography.titleLarge)
                Text(
                    "로그인하면 기록을 서버에 안전하게 백업하고\n새 휴대폰에서도 그대로 이어서 쓸 수 있어요.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
            EmailField(email) { email = it; vm.clearError() }
            PasswordField(pw, "비밀번호") { pw = it; vm.clearError() }
            state.error?.let { InfoBanner(it, "⚠️", warn = true) }
            if (state.loading) {
                CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
            } else {
                PrimaryAction("로그인", onClick = { vm.login(email, pw) },
                    enabled = email.isNotBlank() && pw.isNotBlank() && AuthValidation.emailError(email) == null)
            }
            TextButton(onClick = { nav.navigate(Routes.SIGNUP) }, Modifier.fillMaxWidth()) { Text("처음이신가요? 회원가입") }
            Spacer(Modifier.height(8.dp))
            Text(
                "연결 서버: $server · 설정에서 변경할 수 있어요",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                "로그인하지 않아도 모든 기능을 이 기기 안에서 쓸 수 있어요.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun SignupScreen(nav: NavController, vm: AuthViewModel = viewModel()) {
    val state by vm.state.collectAsState()
    var email by remember { mutableStateOf("") }
    var nickname by remember { mutableStateOf("") }
    var pw by remember { mutableStateOf("") }
    var pw2 by remember { mutableStateOf("") }
    var agree by remember { mutableStateOf(false) }

    LaunchedEffect(state.done) { if (state.done) nav.popBackStack(Routes.HOME, false) }

    val emailErr = AuthValidation.emailError(email)
    val pwErr = AuthValidation.passwordError(pw)
    val pw2Err = if (pw2.isNotEmpty() && pw2 != pw) "비밀번호가 일치하지 않아요" else null
    val nickErr = AuthValidation.nicknameError(nickname)
    val valid = email.isNotBlank() && emailErr == null && pw.isNotBlank() && pwErr == null &&
        pw2 == pw && nickname.isNotBlank() && nickErr == null && agree

    MomScaffold("회원가입", nav) { padding ->
        ScrollScreen(padding) {
            EmailField(email, emailErr) { email = it; vm.clearError() }
            OutlinedTextField(
                value = nickname, onValueChange = { nickname = it; vm.clearError() },
                label = { Text("닉네임 (예: 하늘맘)") }, singleLine = true,
                isError = nickErr != null, supportingText = { nickErr?.let { Text(it) } },
                modifier = Modifier.fillMaxWidth()
            )
            PasswordField(pw, "비밀번호 (영문+숫자 8자 이상)", pwErr) { pw = it; vm.clearError() }
            PasswordField(pw2, "비밀번호 확인", pw2Err) { pw2 = it }
            com.momcare.app.ui.components.SwitchRow(
                "개인정보 처리에 동의해요", agree, { agree = it },
                subtitle = "이메일·닉네임은 계정 관리에만 쓰이고, 육아 기록 백업은 이 기기에서 암호화되어 저장돼요."
            )
            InfoBanner(
                "비밀번호를 잊으면 서버 백업을 열 수 없어요. 비밀번호는 서버도 알 수 없는 암호화 키로 쓰이기 때문이에요.",
                "🔐"
            )
            state.error?.let { InfoBanner(it, "⚠️", warn = true) }
            if (state.loading) {
                CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
            } else {
                PrimaryAction("가입하기", onClick = { vm.signup(email, pw, nickname) }, enabled = valid)
            }
        }
    }
}

@Composable
private fun EmailField(value: String, error: String? = null, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value, onValueChange = onChange,
        label = { Text("이메일") }, singleLine = true,
        isError = error != null, supportingText = { error?.let { Text(it) } },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun PasswordField(value: String, label: String, error: String? = null, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value, onValueChange = onChange,
        label = { Text(label) }, singleLine = true,
        isError = error != null, supportingText = { error?.let { Text(it) } },
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        modifier = Modifier.fillMaxWidth()
    )
}

