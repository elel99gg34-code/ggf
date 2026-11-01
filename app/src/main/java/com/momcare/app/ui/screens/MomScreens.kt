@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.momcare.app.ui.screens

import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.momcare.app.content.CryContent
import com.momcare.app.content.EpdsContent
import com.momcare.app.content.FirstAidContent
import com.momcare.app.content.SelfCareContent
import com.momcare.app.data.EmergencyContact
import com.momcare.app.data.EpdsResult
import com.momcare.app.data.MoodLog
import com.momcare.app.data.SelfCareDay
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.AppTextField
import com.momcare.app.ui.components.BulletList
import com.momcare.app.ui.components.ChartSeries
import com.momcare.app.ui.components.ChipSelector
import com.momcare.app.ui.components.DeleteButton
import com.momcare.app.ui.components.EmptyState
import com.momcare.app.ui.components.FormDialog
import com.momcare.app.ui.components.InfoBanner
import com.momcare.app.ui.components.ItemCard
import com.momcare.app.ui.components.LineChart
import com.momcare.app.ui.components.ListScreen
import com.momcare.app.ui.components.MomScaffold
import com.momcare.app.ui.components.NumberField
import com.momcare.app.ui.components.Pill
import com.momcare.app.ui.components.PrimaryAction
import com.momcare.app.ui.components.ProgressBar
import com.momcare.app.ui.components.RatingRow
import com.momcare.app.ui.components.ScrollScreen
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.SectionHeader
import com.momcare.app.ui.components.StatPill
import com.momcare.app.ui.components.SwitchRow
import com.momcare.app.ui.components.rememberDeleteTarget
import com.momcare.app.ui.nav.Routes
import com.momcare.app.ui.theme.Lavender
import com.momcare.app.ui.theme.Rose
import com.momcare.app.ui.visibilityFlow
import com.momcare.app.util.Dt
import com.momcare.app.util.NoiseGenerator
import com.momcare.app.util.NoiseType
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow

// ═══════════════════════ 마음 건강 ═══════════════════════

class MomMindViewModel(app: Application) : BaseViewModel(app) {
    val moods: StateFlow<List<MoodLog>> = db.moodDao().observeRecent(60).asState(emptyList())
    val epds: StateFlow<List<EpdsResult>> = db.moodDao().observeEpds().asState(emptyList())

    fun saveMood(mood: Int, energy: Int, tags: Set<String>, note: String) = io {
        val day = Dt.dayEpoch()
        val existing = db.moodDao().getDay(day)
        db.moodDao().upsert(
            MoodLog(id = existing?.id ?: 0, dayEpoch = day, mood = mood, energy = energy, tags = tags.joinToString(","), note = note)
        )
    }

    fun deleteMood(m: MoodLog) = io { db.moodDao().delete(m) }

    fun saveEpds(answers: List<Int>) = io {
        db.moodDao().insertEpds(
            EpdsResult(date = Dt.now(), score = EpdsContent.scoreOf(answers), answers = answers.joinToString(","), selfHarmFlag = answers.last() > 0)
        )
    }

    fun deleteEpds(r: EpdsResult) = io { db.moodDao().deleteEpds(r) }
}

private val moodEmojis = listOf("😣", "😕", "😐", "🙂", "😄")

@Composable
fun MomMindScreen(nav: NavController, vm: MomMindViewModel = viewModel()) {
    val moods by vm.moods.collectAsState()
    val epds by vm.epds.collectAsState()
    val today = moods.firstOrNull { it.dayEpoch == Dt.dayEpoch() }
    var mood by remember(today?.id) { mutableStateOf(today?.mood ?: 3) }
    var energy by remember(today?.id) { mutableStateOf(today?.energy ?: 3) }
    var tags by remember(today?.id) { mutableStateOf(today?.tags?.split(",")?.filter { it.isNotBlank() }?.toSet() ?: emptySet()) }
    var note by remember(today?.id) { mutableStateOf(today?.note ?: "") }
    var showTest by remember { mutableStateOf(false) }
    val askDelete = rememberDeleteTarget<EpdsResult>({ vm.deleteEpds(it) })

    MomScaffold("마음 건강", nav) { padding ->
        ListScreen(padding) {
            item {
                SectionCard(title = "오늘 마음은 어때요?", emoji = "💗") {
                    RatingRow("기분", mood, { mood = it }, moodEmojis)
                    RatingRow("에너지", energy, { energy = it }, listOf("🪫", "🔋", "🔋", "🔋", "⚡"))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        EpdsContent.moodTags.forEach { t ->
                            FilterChip(selected = t in tags, onClick = { tags = if (t in tags) tags - t else tags + t }, label = { Text(t) })
                        }
                    }
                    AppTextField(note, { note = it }, "나에게 한 마디", singleLine = false, minLines = 2)
                    PrimaryAction(if (today == null) "기록하기" else "오늘 기록 수정", onClick = { vm.saveMood(mood, energy, tags, note.trim()) })
                }
            }
            val recent = moods.take(14).reversed()
            if (recent.size >= 2) {
                item {
                    SectionCard(title = "최근 2주 기분", emoji = "📈") {
                        LineChart(
                            listOf(
                                ChartSeries("기분", recent.mapIndexed { i, m -> i.toFloat() to m.mood.toFloat() }, Rose),
                                ChartSeries("에너지", recent.mapIndexed { i, m -> i.toFloat() to m.energy.toFloat() }, Lavender, dashed = true)
                            ),
                            xLabel = { "" }, yLabel = { it.toInt().toString() }, height = 160
                        )
                        val lowDays = moods.take(14).count { it.mood <= 2 }
                        if (lowDays >= 7) {
                            InfoBanner("최근 2주 중 힘든 날이 ${lowDays}일이에요. 혼자 견디지 말고 가족이나 전문가와 이야기해보세요.", "🤝", true)
                        }
                    }
                }
            }
            item {
                SectionCard(title = "산후우울 자가점검 (EPDS)", emoji = "📝") {
                    Text("지난 7일 동안의 마음을 10개 문항으로 점검해요. 진단이 아닌 선별용이에요.", style = MaterialTheme.typography.bodyMedium)
                    Button(onClick = { showTest = true }) { Text("점검 시작") }
                    epds.take(5).forEach { r ->
                        val (label, _) = EpdsContent.interpret(r.score)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("${Dt.date(r.date)} · ${r.score}점 · $label", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                            DeleteButton { askDelete(r) }
                        }
                    }
                }
            }
            item { SectionCard(title = "나를 위한 작은 일", emoji = "🌿") { BulletList(EpdsContent.selfCareIdeas, "♡") } }
            item {
                InfoBanner("마음이 너무 힘들 땐 도움을 요청하세요. ${EpdsContent.crisisLine}, 정신건강위기상담 1577-0199", "📞")
            }
        }
    }

    if (showTest) EpdsDialog(onDismiss = { showTest = false }, onSubmit = { vm.saveEpds(it) })
}

@Composable
private fun EpdsDialog(onDismiss: () -> Unit, onSubmit: (List<Int>) -> Unit) {
    val answers = remember { mutableStateListOf<Int>().apply { repeat(EpdsContent.questions.size) { add(-1) } } }
    var step by remember { mutableStateOf(0) }
    var result by remember { mutableStateOf<Int?>(null) }

    if (result != null) {
        val score = result!!
        val (label, desc) = EpdsContent.interpret(score)
        FormDialog("점검 결과", onDismiss, onConfirm = onDismiss, confirmText = "닫기") {
            Text("${score}점 · $label", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
            Text(desc)
            if (answers.last() > 0) {
                InfoBanner("스스로를 해치고 싶은 생각이 든다면 지금 바로 ${EpdsContent.crisisLine}에 전화하세요. 당신은 혼자가 아니에요.", "🆘", true)
            }
        }
        return
    }

    val q = EpdsContent.questions[step]
    FormDialog(
        "문항 ${step + 1} / ${EpdsContent.questions.size}", onDismiss,
        confirmEnabled = answers[step] >= 0,
        confirmText = if (step == EpdsContent.questions.lastIndex) "결과 보기" else "다음",
        onConfirm = {
            if (step < EpdsContent.questions.lastIndex) step++
            else {
                onSubmit(answers.toList())
                result = EpdsContent.scoreOf(answers.toList())
            }
        }
    ) {
        ProgressBar((step + 1f) / EpdsContent.questions.size)
        Text("지난 7일 동안 — ${q.text}", style = MaterialTheme.typography.titleMedium)
        q.options.forEachIndexed { i, opt ->
            Row(Modifier.fillMaxWidth().clickable { answers[step] = i }, verticalAlignment = Alignment.CenterVertically) {
                RadioButton(selected = answers[step] == i, onClick = { answers[step] = i })
                Text(opt)
            }
        }
        if (step > 0) TextButton(onClick = { step-- }) { Text("이전 문항") }
    }
}

// ═══════════════════════ 셀프케어 ═══════════════════════

class SelfCareViewModel(app: Application) : BaseViewModel(app) {
    val days: StateFlow<List<SelfCareDay>> = db.selfCareDao().observeRecent(30).asState(emptyList())
    val waterGoal = prefs.waterGoal

    fun update(transform: (SelfCareDay) -> SelfCareDay) = io {
        val day = Dt.dayEpoch()
        val current = db.selfCareDao().getDay(day) ?: SelfCareDay(dayEpoch = day)
        db.selfCareDao().upsert(transform(current))
    }
}

@Composable
fun SelfCareScreen(nav: NavController, vm: SelfCareViewModel = viewModel()) {
    val days by vm.days.collectAsState()
    val goal by vm.waterGoal.collectAsState()
    val today = days.firstOrNull { it.dayEpoch == Dt.dayEpoch() } ?: SelfCareDay(dayEpoch = Dt.dayEpoch())
    var sleepText by remember(today.id) { mutableStateOf(if (today.sleepHours > 0) today.sleepHours.toString() else "") }

    val score = listOf(
        today.waterCups >= goal, today.vitamin, today.stretch, today.walked, today.meTimeMin >= 15, today.sleepHours >= 6
    ).count { it }

    MomScaffold("셀프케어", nav) { padding ->
        ScrollScreen(padding) {
            SectionCard(title = "오늘의 나 돌보기 $score/6", emoji = "🌷") {
                ProgressBar(score / 6f, color = MaterialTheme.colorScheme.tertiary)
                Text("“${SelfCareContent.affirmationFor(Dt.dayEpoch())}”", style = MaterialTheme.typography.bodyMedium)
            }
            SectionCard(title = "물 마시기 ${today.waterCups}/${goal}잔", emoji = "💧") {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    repeat(maxOf(goal, today.waterCups)) { i ->
                        Box(
                            Modifier.size(36.dp).clip(CircleShape)
                                .background(if (i < today.waterCups) Color(0xFF5B9BD5) else MaterialTheme.colorScheme.surfaceVariant)
                                .clickable { vm.update { it.copy(waterCups = if (i < it.waterCups) i else i + 1) } },
                            contentAlignment = Alignment.Center
                        ) { Text("💧", fontSize = 16.sp) }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { vm.update { it.copy(waterCups = (it.waterCups - 1).coerceAtLeast(0)) } }) { Text("－1잔") }
                    Button(onClick = { vm.update { it.copy(waterCups = it.waterCups + 1) } }) { Text("＋1잔") }
                }
            }
            SectionCard(title = "오늘의 체크", emoji = "✅") {
                SwitchRow("영양제 챙겨 먹기", today.vitamin, { v -> vm.update { it.copy(vitamin = v) } })
                SwitchRow("스트레칭 5분", today.stretch, { v -> vm.update { it.copy(stretch = v) } })
                SwitchRow("햇볕 쬐며 산책", today.walked, { v -> vm.update { it.copy(walked = v) } })
            }
            SectionCard(title = "나만의 시간 ${today.meTimeMin}분", emoji = "☕") {
                Text("하루 15분이라도 오롯이 나를 위해 써보세요.", style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(5, 10, 30).forEach { m ->
                        OutlinedButton(onClick = { vm.update { it.copy(meTimeMin = it.meTimeMin + m) } }) { Text("+${m}분") }
                    }
                    TextButton(onClick = { vm.update { it.copy(meTimeMin = 0) } }) { Text("초기화") }
                }
            }
            SectionCard(title = "어젯밤 수면", emoji = "😴") {
                NumberField(sleepText, { sleepText = it }, "잔 시간", "시간")
                Button(onClick = { vm.update { it.copy(sleepHours = sleepText.toDoubleOrNull() ?: 0.0) } }) { Text("저장") }
                if (today.sleepHours in 0.1..4.9) {
                    InfoBanner("잠이 많이 부족해요. 오늘은 아이 낮잠 시간에 함께 쉬어보세요.", "🛌")
                }
            }
            val week = days.filter { it.dayEpoch > Dt.dayEpoch() - 7 }
            if (week.isNotEmpty()) {
                SectionCard(title = "최근 7일", emoji = "📊") {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("평균 물", "%.1f잔".format(week.map { it.waterCups }.average()), Modifier.weight(1f))
                        StatPill("영양제", "${week.count { it.vitamin }}일", Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                        StatPill("평균 수면", "%.1f시간".format(week.map { it.sleepHours }.filter { it > 0 }.ifEmpty { listOf(0.0) }.average()), Modifier.weight(1f), MaterialTheme.colorScheme.tertiary)
                    }
                }
            }
            SectionCard(title = "산후 이런 증상은 병원에 가세요", emoji = "⚠️") { BulletList(SelfCareContent.postpartumWarnings) }
        }
    }
}

// ═══════════════════════ 백색소음 ═══════════════════════

@Composable
fun WhiteNoiseScreen(nav: NavController) {
    val generator = remember { NoiseGenerator() }
    var type by remember { mutableStateOf(NoiseType.WHITE) }
    var playing by remember { mutableStateOf(false) }
    var volume by remember { mutableStateOf(0.6f) }
    var timerMin by remember { mutableStateOf(30) }
    var endAt by remember { mutableStateOf(0L) }
    var now by remember { mutableStateOf(Dt.now()) }

    DisposableEffect(Unit) { onDispose { generator.stop() } }
    LaunchedEffect(playing, endAt) {
        while (playing) {
            now = Dt.now()
            if (endAt > 0 && now >= endAt) {
                generator.stop(); playing = false
            }
            delay(1000)
        }
    }

    fun play() {
        generator.volume = volume
        generator.start(type)
        playing = true
        endAt = if (timerMin > 0) Dt.now() + timerMin * 60_000L else 0L
    }

    MomScaffold("백색소음", nav) { padding ->
        ScrollScreen(padding) {
            InfoBanner("화면이 켜져 있는 동안 재생돼요. 아기와 스피커 사이는 1m 이상, 소리는 샤워 소리보다 작게 해주세요.", "🎧")
            NoiseType.entries.forEach { t ->
                ItemCard(
                    t.emoji, t.label, t.desc,
                    accent = if (t == type) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                    trailing = { if (t == type) Pill("선택됨") },
                    onClick = {
                        type = t
                        if (playing) generator.start(t)
                    }
                )
            }
            SectionCard(title = "볼륨", emoji = "🔊") {
                Slider(value = volume, onValueChange = { volume = it; generator.volume = it }, valueRange = 0.05f..1f)
            }
            SectionCard(title = "꺼짐 타이머", emoji = "⏲️") {
                ChipSelector(listOf(15, 30, 60, 120, 0), timerMin, { if (it == 0) "계속" else "${it}분" }, { timerMin = it; if (playing) endAt = if (it > 0) Dt.now() + it * 60_000L else 0L })
                if (playing && endAt > 0) Text("${Dt.elapsedClock(endAt - now)} 후 꺼져요", style = MaterialTheme.typography.bodyMedium)
            }
            if (!playing) {
                PrimaryAction("▶ 재생", onClick = { play() })
            } else {
                PrimaryAction("■ 정지", onClick = { generator.stop(); playing = false })
            }
        }
    }
}

// ═══════════════════════ 울음 도우미 ═══════════════════════

@Composable
fun CryHelperScreen(nav: NavController) {
    var selected by remember { mutableStateOf<String?>(null) }
    val checked = remember { mutableStateListOf<String>() }

    MomScaffold("울음 도우미", nav) { padding ->
        ListScreen(padding) {
            item { InfoBanner("아기가 울 때 해당되는 신호를 눌러보세요. 가장 많이 맞는 원인부터 확인해요.", "😭") }
            val ranked = CryContent.causes.sortedByDescending { c -> c.signs.count { it in checked } }
            items(ranked, key = { it.id }) { c ->
                val matches = c.signs.count { it in checked }
                SectionCard(title = c.title, emoji = c.emoji, modifier = Modifier.clickable { selected = if (selected == c.id) null else c.id }) {
                    if (matches > 0) Pill("신호 ${matches}개 일치")
                    c.signs.forEach { s ->
                        Row(Modifier.fillMaxWidth().clickable { if (s in checked) checked.remove(s) else checked.add(s) }, verticalAlignment = Alignment.CenterVertically) {
                            androidx.compose.material3.Checkbox(checked = s in checked, onCheckedChange = { if (it) checked.add(s) else checked.remove(s) })
                            Text(s, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    if (selected == c.id || matches > 0) {
                        Text("이렇게 해보세요", style = MaterialTheme.typography.titleMedium)
                        BulletList(c.actions, "👉")
                    }
                }
            }
            item { SectionCard(title = "달래는 방법", emoji = "🤱") { BulletList(CryContent.soothingTechniques) } }
            item {
                SectionCard(title = "바로 병원·119", emoji = "🚨", container = Color(0xFFFFEAEA)) {
                    BulletList(CryContent.warningSigns)
                    OutlinedButton(onClick = { nav.navigate(Routes.EMERGENCY) }) { Text("응급 가이드 열기") }
                }
            }
        }
    }
}

// ═══════════════════════ 응급 가이드·연락처 ═══════════════════════

class EmergencyViewModel(app: Application) : BaseViewModel(app) {
    val contacts: StateFlow<List<EmergencyContact>> = db.emergencyContactDao().observeAll().asState(emptyList())
    val visibility = visibilityFlow()
    fun save(c: EmergencyContact) = io { db.emergencyContactDao().upsert(c) }
    fun delete(c: EmergencyContact) = io { db.emergencyContactDao().delete(c) }
}

@Composable
fun EmergencyScreen(nav: NavController, vm: EmergencyViewModel = viewModel()) {
    val contacts by vm.contacts.collectAsState()
    val ctx = LocalContext.current
    var open by remember { mutableStateOf<String?>(null) }
    var dialog by remember { mutableStateOf<EmergencyContact?>(null) }
    val askDelete = rememberDeleteTarget<EmergencyContact>({ vm.delete(it) })

    fun dial(number: String) {
        // 바로 걸지 않고 다이얼 화면을 띄워 실수로 전화하는 일을 막는다
        ctx.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")))
    }

    MomScaffold("응급 가이드", nav, fabLabel = "연락처 추가", onFab = { dialog = EmergencyContact(name = "", phone = "") }) { padding ->
        ListScreen(padding) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { dial("119") }, Modifier.weight(1f).height(64.dp),
                        colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) { Text("🚑 119", fontSize = 22.sp) }
                    OutlinedButton(onClick = { dial("112") }, Modifier.weight(1f).height(64.dp)) { Text("🚓 112", fontSize = 20.sp) }
                }
            }
            item {
                SectionCard(title = "도움받을 수 있는 번호", emoji = "📞") {
                    FirstAidContent.numbers.drop(2).forEach { (num, label) ->
                        Row(Modifier.fillMaxWidth().clickable { dial(num) }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(num, Modifier.width(64.dp), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                            Text(label, Modifier.weight(1f))
                            Icon(Icons.Default.Call, contentDescription = "전화")
                        }
                    }
                }
            }
            item { SectionHeader("우리 가족 비상 연락처") }
            if (contacts.isEmpty()) item { Text("소아과, 가족, 이웃 연락처를 등록해두세요.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(contacts, key = { it.id }) { c ->
                ItemCard(
                    "📇", c.name, "${c.relation} · ${c.phone}", detail = c.memo.takeIf { it.isNotBlank() },
                    onClick = { dialog = c },
                    trailing = {
                        Row {
                            IconButton(onClick = { dial(c.phone) }) { Icon(Icons.Default.Call, "전화") }
                            DeleteButton { askDelete(c) }
                        }
                    }
                )
            }
            item { SectionHeader("상황별 응급처치") }
            items(FirstAidContent.all, key = { it.id }) { g ->
                SectionCard(
                    title = g.title, emoji = g.emoji,
                    modifier = Modifier.clickable { open = if (open == g.id) null else g.id },
                    container = if (g.urgent) Color(0xFFFFF3F3) else MaterialTheme.colorScheme.surface
                ) {
                    if (open == g.id) {
                        g.steps.forEachIndexed { i, s ->
                            Row {
                                Text("${i + 1}.", Modifier.width(24.dp), color = MaterialTheme.colorScheme.primary)
                                Text(s, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                        InfoBanner("이럴 땐 바로 119: ${g.callWhen}", "🚨", warn = true)
                    } else {
                        Text("눌러서 방법 보기", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }

    dialog?.let { c ->
        var name by remember(c) { mutableStateOf(c.name) }
        var relation by remember(c) { mutableStateOf(c.relation) }
        var phone by remember(c) { mutableStateOf(c.phone) }
        var memo by remember(c) { mutableStateOf(c.memo) }
        FormDialog("비상 연락처", { dialog = null }, confirmEnabled = name.isNotBlank() && phone.isNotBlank(), onConfirm = {
            vm.save(c.copy(name = name.trim(), relation = relation.trim(), phone = phone.trim(), memo = memo.trim())); dialog = null
        }) {
            AppTextField(name, { name = it }, "이름 (예: ○○소아과)")
            ChipSelector(listOf("소아과", "남편", "친정", "시댁", "이웃", "어린이집"), relation, { it }, { relation = it })
            AppTextField(relation, { relation = it }, "관계")
            AppTextField(phone, { phone = it }, "전화번호", keyboard = androidx.compose.ui.text.input.KeyboardType.Phone)
            AppTextField(memo, { memo = it }, "메모 (진료시간 등)")
        }
    }
}
