package com.momcare.app.ui.screens

import android.app.Application
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.momcare.app.data.remote.ApiException
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.AppTextField
import com.momcare.app.ui.components.ConfirmDialog
import com.momcare.app.ui.components.FormDialog
import com.momcare.app.ui.components.InfoBanner
import com.momcare.app.ui.components.MomScaffold
import com.momcare.app.ui.components.NumberField
import com.momcare.app.ui.components.ScrollScreen
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.SwitchRow
import com.momcare.app.ui.nav.Features
import com.momcare.app.ui.nav.Routes
import com.momcare.app.ui.visibilityFlow
import com.momcare.app.util.Dt
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SettingsViewModel(app: Application) : BaseViewModel(app) {
    val visibility = visibilityFlow()
    val momName = prefs.momName
    val waterGoal = prefs.waterGoal
    val session = container.session.session
    val serverUrl = container.session.serverUrl

    /** 진행 중 작업 메시지 (null 이면 대기 상태) */
    private val _busy = MutableStateFlow<String?>(null)
    val busy = _busy.asStateFlow()
    private val _message = MutableStateFlow<String?>(null)
    val message = _message.asStateFlow()
    private val _serverInfo = MutableStateFlow<String?>(null)
    val serverInfo = _serverInfo.asStateFlow()

    fun setShowChild(on: Boolean) = prefs.setShowChild(on)
    fun setShowPregnancy(on: Boolean) = prefs.setShowPregnancy(on)
    fun setShowDiaper(on: Boolean) = prefs.setShowDiaper(on)
    fun setMomName(n: String) = prefs.setMomName(n.trim().ifBlank { "엄마" })
    fun setWaterGoal(n: Int) = prefs.setWaterGoal(n.coerceIn(1, 20))
    fun setServerUrl(u: String) = container.session.setServerUrl(u)
    fun dismissMessage() { _message.value = null }

    private fun task(label: String, block: suspend () -> String) {
        if (_busy.value != null) return
        _busy.value = label
        viewModelScope.launch {
            _message.value = try {
                block()
            } catch (e: ApiException) {
                if (e.status == 401) container.session.clear()
                e.message
            } catch (e: Exception) {
                e.message ?: "오류가 발생했어요."
            } finally {
                _busy.value = null
            }
        }
    }

    fun refreshServerInfo() = viewModelScope.launch {
        _serverInfo.value = runCatching { container.backup.serverInfo() }.getOrNull()?.let {
            "서버 백업: ${Dt.dateTime(it.updatedAt)} · ${"%.1f".format(it.size / 1024.0)}KB"
        } ?: "서버에 저장된 백업이 없어요"
    }

    fun checkServer() = task("서버 확인 중…") {
        if (container.api.health()) "서버와 정상적으로 연결됐어요 ✅" else "서버에 연결할 수 없어요. 주소를 확인해주세요."
    }

    fun backupToServer() = task("서버에 백업 중…") {
        val info = container.backup.uploadToServer()
        refreshServerInfo()
        "백업 완료 (${"%.1f".format(info.size / 1024.0)}KB, 암호화됨)"
    }

    fun restoreFromServer() = task("서버에서 복원 중…") {
        container.backup.restoreFromServer()
        "복원 완료"
    }

    fun exportFile(uri: android.net.Uri, password: String) = task("파일로 내보내는 중…") {
        container.backup.exportToUri(uri, password); "백업 파일을 저장했어요"
    }

    fun importFile(uri: android.net.Uri, password: String) = task("파일에서 복원 중…") {
        container.backup.importFromUri(uri, password); "복원 완료"
    }

    fun changePassword(current: String, next: String) = task("비밀번호 변경 중…") {
        val s = container.session.session.value ?: error("로그인이 필요해요")
        container.api.changePassword(s.token, current, next)
        // 새 비밀번호로 암호화 키를 다시 만들고 바로 새로 백업한다
        val key = com.momcare.app.data.remote.BackupCrypto.deriveKey(s.email, next)
        container.session.save(s, com.momcare.app.data.remote.BackupCrypto.keyToString(key))
        runCatching { container.backup.uploadToServer() }
        "비밀번호를 바꿨어요. 새 비밀번호로 백업도 다시 저장했어요."
    }

    fun logout() {
        container.session.clear()
        _serverInfo.value = null
        _message.value = "로그아웃했어요. 이 기기의 기록은 그대로 남아있어요."
    }

    fun deleteAccount(password: String) = task("계정 삭제 중…") {
        val s = container.session.session.value ?: error("로그인이 필요해요")
        container.api.deleteAccount(s.token, password)
        container.session.clear()
        "계정과 서버 백업을 삭제했어요. 이 기기의 기록은 남아있어요."
    }

    fun lockAgain() = prefs.setUnlocked(false)
}

@Composable
fun SettingsScreen(nav: NavController, vm: SettingsViewModel = viewModel()) {
    val visibility by vm.visibility.collectAsState()
    val momName by vm.momName.collectAsState()
    val waterGoal by vm.waterGoal.collectAsState()
    val session by vm.session.collectAsState()
    val server by vm.serverUrl.collectAsState()
    val busy by vm.busy.collectAsState()
    val message by vm.message.collectAsState()
    val serverInfo by vm.serverInfo.collectAsState()

    var editName by remember { mutableStateOf(false) }
    var editServer by remember { mutableStateOf(false) }
    var confirmRestore by remember { mutableStateOf(false) }
    var confirmLock by remember { mutableStateOf(false) }
    var changePw by remember { mutableStateOf(false) }
    var deleteAccount by remember { mutableStateOf(false) }
    var filePasswordFor by remember { mutableStateOf<Pair<String, android.net.Uri>?>(null) }

    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/octet-stream")) { uri ->
        if (uri != null) filePasswordFor = "export" to uri
    }
    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) filePasswordFor = "import" to uri
    }

    LaunchedEffect(session?.token) { if (session != null) vm.refreshServerInfo() }

    MomScaffold("설정", nav) { padding ->
        ScrollScreen(padding) {
            busy?.let {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CircularProgressIndicator()
                    Text(it, style = MaterialTheme.typography.bodyLarge)
                }
            }
            message?.let { m ->
                InfoBanner(m, "ℹ️")
                TextButton(onClick = { vm.dismissMessage() }) { Text("확인") }
            }

            // ── 계정 ──
            SectionCard(title = "계정·서버 백업", emoji = "☁️") {
                val s = session
                if (s == null) {
                    Text("로그인하면 기록을 암호화해서 서버에 백업할 수 있어요.", style = MaterialTheme.typography.bodyMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { nav.navigate(Routes.LOGIN) }) { Text("로그인") }
                        OutlinedButton(onClick = { nav.navigate(Routes.SIGNUP) }) { Text("회원가입") }
                    }
                } else {
                    Text("${s.nickname} (${s.email})", style = MaterialTheme.typography.titleMedium)
                    serverInfo?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { vm.backupToServer() }, enabled = busy == null) { Text("지금 백업") }
                        OutlinedButton(onClick = { confirmRestore = true }, enabled = busy == null) { Text("서버에서 복원") }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        TextButton(onClick = { changePw = true }) { Text("비밀번호 변경") }
                        TextButton(onClick = { vm.logout() }) { Text("로그아웃") }
                        TextButton(onClick = { deleteAccount = true }) { Text("계정 삭제", color = MaterialTheme.colorScheme.error) }
                    }
                }
                Text("서버 주소: $server", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row {
                    TextButton(onClick = { editServer = true }) { Text("서버 주소 변경") }
                    TextButton(onClick = { vm.checkServer() }) { Text("연결 확인") }
                }
            }

            // ── 기능 표시 (비공개) ──
            SectionCard(title = "기능 표시 (비공개 설정)", emoji = "🔒") {
                Text(
                    "꺼져 있는 기능은 홈과 메뉴에서 완전히 숨겨져요. 기록은 지워지지 않아요.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                SwitchRow("아이·육아 기능 표시", visibility.child, { vm.setShowChild(it) },
                    subtitle = "아이 프로필, 수유·수면, 성장, 접종, 발달, 놀이 등")
                SwitchRow("임신·출산 기능 표시", visibility.pregnancy, { vm.setShowPregnancy(it) },
                    subtitle = "임신 주차, 태동 카운터, 진통 타이머")
                SwitchRow("기저귀 기능 표시", visibility.diaper, { vm.setShowDiaper(it) },
                    subtitle = if (visibility.child) "기저귀 기록, 재고, 체크리스트 항목" else "아이·육아 기능을 먼저 켜주세요")
                Text("현재 숨겨진 기능 ${Features.hiddenCount(visibility)}개", style = MaterialTheme.typography.bodySmall)
            }

            // ── 개인 설정 ──
            SectionCard(title = "내 정보", emoji = "🌷") {
                Row(Modifier.fillMaxWidth()) {
                    Text("부를 이름: $momName", Modifier.weight(1f))
                    TextButton(onClick = { editName = true }) { Text("변경") }
                }
                Row(Modifier.fillMaxWidth()) {
                    Text("하루 물 목표: ${waterGoal}잔", Modifier.weight(1f))
                    TextButton(onClick = { vm.setWaterGoal(waterGoal - 1) }) { Text("－") }
                    TextButton(onClick = { vm.setWaterGoal(waterGoal + 1) }) { Text("＋") }
                }
            }

            // ── 파일 백업 ──
            SectionCard(title = "파일로 백업·복원", emoji = "💾") {
                Text(
                    "로그인 없이도 백업 파일을 만들어 드라이브나 메신저로 보관할 수 있어요. 파일은 비밀번호로 암호화돼요.",
                    style = MaterialTheme.typography.bodySmall
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { exportLauncher.launch("momcare_${Dt.date(Dt.now()).replace(".", "")}.mcb") }) { Text("백업 파일 만들기") }
                    OutlinedButton(onClick = { importLauncher.launch(arrayOf("*/*")) }) { Text("파일에서 복원") }
                }
            }

            // ── 보안 ──
            SectionCard(title = "앱 잠금", emoji = "🔐") {
                Text("가족 비밀번호로 잠금이 해제된 상태예요.", style = MaterialTheme.typography.bodySmall)
                TextButton(onClick = { confirmLock = true }) { Text("지금 다시 잠그기") }
            }

            SectionCard(title = "앱 정보", emoji = "ℹ️") {
                Text("맘케어 1.0.0", style = MaterialTheme.typography.bodyMedium)
                Text(
                    "앱의 건강 정보는 참고용이며 의학적 진단을 대신하지 않아요. 아이 상태가 걱정되면 소아과나 119에 연락하세요.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }

    if (editName) {
        var n by remember { mutableStateOf(momName) }
        FormDialog("부를 이름", { editName = false }, onConfirm = { vm.setMomName(n); editName = false }) {
            AppTextField(n, { n = it }, "이름 (예: 하늘맘)")
        }
    }
    if (editServer) {
        var u by remember { mutableStateOf(server) }
        FormDialog("서버 주소", { editServer = false }, confirmEnabled = u.startsWith("http"), onConfirm = { vm.setServerUrl(u); editServer = false }) {
            AppTextField(u, { u = it }, "https://내서버주소")
            Text("에뮬레이터에서 PC 로컬 서버: http://10.0.2.2:8080", style = MaterialTheme.typography.bodySmall)
        }
    }
    if (confirmRestore) {
        ConfirmDialog("서버 백업으로 복원할까요?", "이 기기의 현재 기록이 서버 백업 내용으로 바뀌고 앱이 다시 시작돼요.",
            { confirmRestore = false }, { vm.restoreFromServer() }, confirmText = "복원")
    }
    if (confirmLock) {
        ConfirmDialog("앱을 다시 잠글까요?", "바로 잠금 화면으로 바뀌고, 가족 비밀번호를 다시 입력해야 열 수 있어요.",
            { confirmLock = false }, { vm.lockAgain() }, confirmText = "잠그기")
    }
    if (changePw) {
        var cur by remember { mutableStateOf("") }
        var next by remember { mutableStateOf("") }
        val err = AuthValidation.passwordError(next)
        FormDialog("비밀번호 변경", { changePw = false }, confirmEnabled = cur.isNotBlank() && next.isNotBlank() && err == null,
            onConfirm = { vm.changePassword(cur, next); changePw = false }) {
            AppTextField(cur, { cur = it }, "현재 비밀번호", isPassword = true)
            AppTextField(next, { next = it }, "새 비밀번호", isPassword = true)
            err?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }
    }
    if (deleteAccount) {
        var pw by remember { mutableStateOf("") }
        FormDialog("계정을 삭제할까요?", { deleteAccount = false }, confirmEnabled = pw.isNotBlank(), confirmText = "삭제",
            onConfirm = { vm.deleteAccount(pw); deleteAccount = false }) {
            Text("서버의 계정과 백업이 영구 삭제돼요. 이 기기의 기록은 남아있어요.")
            AppTextField(pw, { pw = it }, "비밀번호 확인", isPassword = true)
        }
    }
    filePasswordFor?.let { (mode, uri) ->
        var pw by remember(uri) { mutableStateOf("") }
        FormDialog(
            if (mode == "export") "백업 파일 비밀번호" else "백업 파일 비밀번호 입력",
            { filePasswordFor = null }, confirmEnabled = pw.length >= 4,
            onConfirm = {
                if (mode == "export") vm.exportFile(uri, pw) else vm.importFile(uri, pw)
                filePasswordFor = null
            }
        ) {
            Text(
                if (mode == "export") "복원할 때 필요해요. 잊어버리면 파일을 열 수 없어요." else "백업 파일을 만들 때 정한 비밀번호를 입력하세요.",
                style = MaterialTheme.typography.bodySmall
            )
            AppTextField(pw, { pw = it }, "비밀번호 (4자 이상)", isPassword = true)
        }
    }
}
