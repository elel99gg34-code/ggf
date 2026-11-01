package com.momcare.app.ui.screens

import android.app.Application
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.momcare.app.content.CounselContent
import com.momcare.app.content.CounselSkill
import com.momcare.app.data.CounselAlarm
import com.momcare.app.data.CounselCheckin
import com.momcare.app.data.CounselJournal
import com.momcare.app.data.CounselProgress
import com.momcare.app.notif.Reminders
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.AppTextField
import com.momcare.app.ui.components.BulletList
import com.momcare.app.ui.components.ChipSelector
import com.momcare.app.ui.components.DateField
import com.momcare.app.ui.components.DeleteButton
import com.momcare.app.ui.components.EmptyState
import com.momcare.app.ui.components.FormDialog
import com.momcare.app.ui.components.HourMinuteDialog
import com.momcare.app.ui.components.InfoBanner
import com.momcare.app.ui.components.ItemCard
import com.momcare.app.ui.components.ListScreen
import com.momcare.app.ui.components.LocalChild
import com.momcare.app.ui.components.MomScaffold
import com.momcare.app.ui.components.Pill
import com.momcare.app.ui.components.PrimaryAction
import com.momcare.app.ui.components.ProgressBar
import com.momcare.app.ui.components.RatingRow
import com.momcare.app.ui.components.ScrollScreen
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.SectionHeader
import com.momcare.app.ui.components.StatPill
import com.momcare.app.ui.components.LazyRowItems
import com.momcare.app.ui.components.rememberDeleteTarget
import com.momcare.app.ui.nav.Routes
import com.momcare.app.util.Dt
import kotlinx.coroutines.flow.StateFlow

class CounselViewModel(app: Application) : BaseViewModel(app) {
    val progress: StateFlow<List<CounselProgress>> = db.counselDao().observeProgress().asState(emptyList())
    val alarms: StateFlow<List<CounselAlarm>> = db.counselDao().observeAlarms().asState(emptyList())
    val checkins: StateFlow<List<CounselCheckin>> = db.counselDao().observeCheckins(120).asState(emptyList())
    val journals: StateFlow<List<CounselJournal>> = db.counselDao().observeJournals().asState(emptyList())

    private suspend fun progressOf(id: String) =
        db.counselDao().getProgress(id) ?: CounselProgress(skillId = id)

    fun setLearned(id: String, learned: Boolean) = io {
        db.counselDao().upsertProgress(progressOf(id).copy(learned = learned))
    }

    fun toggleFavorite(id: String) = io {
        val p = progressOf(id)
        db.counselDao().upsertProgress(p.copy(favorite = !p.favorite))
    }

    /** "오늘 연습했어요" - 연습 횟수 +1, 학습 완료, 오늘 체크인 */
    fun practice(id: String, rating: Int) = io {
        val p = progressOf(id)
        db.counselDao().upsertProgress(
            p.copy(learned = true, practiceCount = p.practiceCount + 1, lastPracticed = Dt.now())
        )
        db.counselDao().upsertCheckin(CounselCheckin(dayEpoch = Dt.dayEpoch(), skillId = id, rating = rating))
    }

    fun saveNote(id: String, note: String) = io {
        db.counselDao().upsertProgress(progressOf(id).copy(myNote = note))
    }

    // ── 알람 ──
    fun saveAlarm(alarm: CounselAlarm) = io {
        val id = db.counselDao().upsertAlarm(alarm)
        val saved = if (alarm.id == 0L) alarm.copy(id = id) else alarm
        Reminders.scheduleCounselAlarm(context, saved)
    }

    fun toggleAlarm(alarm: CounselAlarm, on: Boolean) = saveAlarm(alarm.copy(enabled = on))

    fun deleteAlarm(alarm: CounselAlarm) = io {
        Reminders.cancel(context, Reminders.counselKey(alarm.id))
        db.counselDao().deleteAlarm(alarm)
    }

    /** 지금 바로 알림이 어떻게 보이는지 미리보기 */
    fun preview(alarm: CounselAlarm) {
        val skill = alarm.fixedSkillId.takeIf { it.isNotBlank() }?.let { CounselContent.skillById(it) }
            ?: CounselContent.dailySkill(Dt.dayEpoch(), alarm.category, alarm.id.toInt())
        Reminders.show(
            context, 9001, Reminders.CHANNEL_COUNSEL,
            "${skill.emoji} ${alarm.label}: ${skill.title}", skill.summary,
            route = Routes.counselSkill(skill.id),
            bigText = skill.summary + "\n\n💬 " + (skill.sayThis.firstOrNull() ?: "") + "\n\n🎯 " + skill.practice
        )
    }

    // ── 일지 ──
    fun saveJournal(j: CounselJournal) = io { db.counselDao().upsertJournal(j) }
    fun deleteJournal(j: CounselJournal) = io { db.counselDao().deleteJournal(j) }
}

// ═══════════════════════ 상담 스킬 코치 홈 ═══════════════════════

@Composable
fun CounselHomeScreen(nav: NavController, vm: CounselViewModel = viewModel()) {
    val progress by vm.progress.collectAsState()
    val checkins by vm.checkins.collectAsState()
    val learnedIds = progress.filter { it.learned }.map { it.skillId }.toSet()
    val favIds = progress.filter { it.favorite }.map { it.skillId }.toSet()
    val total = CounselContent.all.size
    val practiceTotal = progress.sumOf { it.practiceCount }
    val streak = counselStreak(checkins.map { it.dayEpoch }.toSet())
    var category by remember { mutableStateOf("") }
    val today = CounselContent.dailySkill(Dt.dayEpoch())

    MomScaffold("상담 스킬 코치", nav) { padding ->
        ListScreen(padding) {
            item {
                SectionCard(title = "나의 상담 실력", emoji = "🏅") {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("배운 스킬", "${learnedIds.size}/$total", Modifier.weight(1f))
                        StatPill("연습 횟수", "${practiceTotal}회", Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                        StatPill("연속", "${streak}일", Modifier.weight(1f), MaterialTheme.colorScheme.tertiary)
                    }
                    ProgressBar(if (total == 0) 0f else learnedIds.size.toFloat() / total)
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { nav.navigate(Routes.COUNSEL_ALARM) }, Modifier.weight(1f)) { Text("⏰ 스킬 알람") }
                    OutlinedButton(onClick = { nav.navigate(Routes.COUNSEL_JOURNAL) }, Modifier.weight(1f)) { Text("📝 상담 일지") }
                }
            }
            item {
                SectionCard(
                    title = "오늘의 스킬", emoji = today.emoji,
                    container = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                ) {
                    Text(today.title, style = MaterialTheme.typography.titleMedium)
                    Text(today.summary, style = MaterialTheme.typography.bodyMedium)
                    Text("💬 " + (today.sayThis.firstOrNull() ?: ""), style = MaterialTheme.typography.bodyMedium)
                    OutlinedButton(onClick = { nav.navigate(Routes.counselSkill(today.id)) }) { Text("자세히 보고 연습하기") }
                }
            }
            item { SectionHeader("지금 바로 쓰는 한 마디") }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    CounselContent.quickPhrases.forEach { q ->
                        ItemCard(
                            emoji = q.emoji, title = q.situation, subtitle = "“${q.phrase}”",
                            onClick = { nav.navigate(Routes.counselSkill(q.skillId)) }
                        )
                    }
                }
            }
            item { SectionHeader("처음이라면 이 순서로") }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    CounselContent.starterPath.mapNotNull { CounselContent.skillById(it) }.forEachIndexed { i, s ->
                        ItemCard(
                            emoji = s.emoji, title = "${i + 1}. ${s.title}", subtitle = s.summary,
                            trailing = { if (s.id in learnedIds) Pill("✔ 완료") },
                            onClick = { nav.navigate(Routes.counselSkill(s.id)) }
                        )
                    }
                }
            }
            item { SectionHeader("분야별 스킬") }
            item {
                val cats = listOf("") + CounselContent.categories.map { it.id }
                ChipSelector(
                    cats, category,
                    { id -> if (id.isEmpty()) "전체" else CounselContent.categoryOf(id)?.let { "${it.emoji} ${it.title}" } ?: id },
                    { category = it }
                )
            }
            if (category.isNotEmpty()) {
                item {
                    Text(
                        CounselContent.categoryOf(category)?.desc ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            val shown = CounselContent.skillsIn(category)
            items(shown.size) { i ->
                val s = shown[i]
                ItemCard(
                    emoji = s.emoji, title = s.title, subtitle = s.summary,
                    detail = "Lv.${s.level} · ${CounselContent.categoryOf(s.category)?.title ?: ""}",
                    trailing = {
                        Column(horizontalAlignment = Alignment.End) {
                            if (s.id in favIds) Text("⭐")
                            if (s.id in learnedIds) Pill("✔")
                        }
                    },
                    onClick = { nav.navigate(Routes.counselSkill(s.id)) }
                )
            }
        }
    }
}

// ═══════════════════════ 스킬 상세 ═══════════════════════

@Composable
fun CounselSkillScreen(nav: NavController, skillId: String, vm: CounselViewModel = viewModel()) {
    val skill = CounselContent.skillById(skillId)
    val progressList by vm.progress.collectAsState()
    val progress = progressList.firstOrNull { it.skillId == skillId }

    if (skill == null) {
        MomScaffold("상담 스킬", nav) { EmptyState("🤔", "스킬을 찾을 수 없어요") }
        return
    }

    var rating by remember { mutableStateOf(3) }
    var note by remember(progress?.myNote) { mutableStateOf(progress?.myNote ?: "") }
    var practiced by remember { mutableStateOf(false) }

    MomScaffold(
        skill.title, nav,
        actions = {
            androidx.compose.material3.TextButton(onClick = { vm.toggleFavorite(skill.id) }) {
                Text(if (progress?.favorite == true) "⭐ 저장됨" else "☆ 저장")
            }
        }
    ) { padding ->
        ScrollScreen(padding) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(skill.emoji, fontSize = 44.sp)
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(skill.summary, style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Pill(CounselContent.categoryOf(skill.category)?.title ?: "")
                        Pill("Lv.${skill.level}")
                        if (progress?.learned == true) Pill("✔ 배움")
                    }
                }
            }
            SectionCard(title = "왜 중요할까요?", emoji = "💡") { Text(skill.why, style = MaterialTheme.typography.bodyMedium) }
            SectionCard(title = "이렇게 해보세요", emoji = "🪜") {
                skill.steps.forEachIndexed { i, s ->
                    Row {
                        Text("${i + 1}.", Modifier.width(24.dp), color = MaterialTheme.colorScheme.primary)
                        Text(s, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            SectionCard(title = "이렇게 말해보세요", emoji = "💬", container = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)) {
                skill.sayThis.forEach { Text("“$it”", style = MaterialTheme.typography.bodyLarge) }
            }
            SectionCard(title = "이건 피해주세요", emoji = "🚫") { BulletList(skill.avoid, "✕") }
            SectionCard(title = "이런 상황이에요", emoji = "🎬") { Text(skill.scenario, style = MaterialTheme.typography.bodyMedium) }
            SectionCard(title = "오늘의 미션", emoji = "🎯") {
                Text(skill.practice, style = MaterialTheme.typography.bodyLarge)
                if (!practiced) {
                    RatingRow("실천해본 느낌은?", rating, { rating = it })
                    PrimaryAction("오늘 연습했어요 (${progress?.practiceCount ?: 0}회)", onClick = {
                        vm.practice(skill.id, rating); practiced = true
                    })
                } else {
                    InfoBanner("멋져요! 연습 기록과 연속 일수가 업데이트됐어요 🎉", "🎉")
                }
            }
            AppTextField(note, { note = it }, "나만의 메모 (내 상황에 맞게 적어보세요)", singleLine = false, minLines = 3)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = { vm.saveNote(skill.id, note) }, Modifier.weight(1f)) { Text("메모 저장") }
                OutlinedButton(
                    onClick = { vm.setLearned(skill.id, progress?.learned != true) }, Modifier.weight(1f)
                ) { Text(if (progress?.learned == true) "배움 취소" else "배웠어요") }
            }
            OutlinedButton(onClick = { nav.navigate(Routes.COUNSEL_JOURNAL) }, Modifier.fillMaxWidth()) {
                Text("📝 이 스킬로 상담 일지 쓰기")
            }
        }
    }
}

// ═══════════════════════ 알람 ═══════════════════════

private val dayLabels = listOf("월", "화", "수", "목", "금", "토", "일")

private fun daysText(mask: Int): String = when {
    mask and 127 == 127 -> "매일"
    mask and 127 == 31 -> "평일"
    mask and 127 == 96 -> "주말"
    else -> dayLabels.filterIndexed { i, _ -> mask and (1 shl i) != 0 }.joinToString(" ")
}

@Composable
fun CounselAlarmScreen(nav: NavController, vm: CounselViewModel = viewModel()) {
    val alarms by vm.alarms.collectAsState()
    var editing by remember { mutableStateOf<CounselAlarm?>(null) }
    var adding by remember { mutableStateOf(false) }
    val askDelete = rememberDeleteTarget<CounselAlarm>({ vm.deleteAlarm(it) }, "알람을 삭제할까요?", "이 알람은 더 이상 울리지 않아요.")

    MomScaffold("상담 스킬 알람", nav, fabLabel = "알람 추가", onFab = { adding = true }) { padding ->
        ListScreen(padding) {
            item {
                InfoBanner(
                    "정해둔 시간에 알람처럼 '오늘의 상담 스킬'이 알림으로 도착해요. 알림을 누르면 바로 연습 화면이 열려요.",
                    "⏰"
                )
            }
            if (alarms.isEmpty()) {
                item {
                    EmptyState("⏰", "설정된 알람이 없어요", "아침 출근길, 하원 후, 잠들기 전 같은 시간으로 추천 알람을 추가해보세요.")
                }
                item {
                    Button(
                        onClick = {
                            vm.saveAlarm(CounselAlarm(hour = 8, minute = 30, label = "아침 상담 스킬", category = ""))
                            vm.saveAlarm(CounselAlarm(hour = 21, minute = 30, label = "밤 마무리 스킬", category = "SELF"))
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("추천 알람 2개 한 번에 추가") }
                }
            }
            items(alarms.size) { i ->
                val a = alarms[i]
                SectionCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f).clickable { editing = a }) {
                            Text(
                                Dt.hm(a.hour, a.minute),
                                fontSize = 34.sp,
                                color = if (a.enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text("${a.label} · ${daysText(a.daysMask)}", style = MaterialTheme.typography.bodyMedium)
                            val cat = CounselContent.categoryOf(a.category)
                            val fixed = CounselContent.skillById(a.fixedSkillId)
                            Text(
                                fixed?.let { "고정: ${it.emoji} ${it.title}" }
                                    ?: (cat?.let { "${it.emoji} ${it.title} 분야" } ?: "모든 분야에서 자동 선택"),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(checked = a.enabled, onCheckedChange = { vm.toggleAlarm(a, it) })
                    }
                    Row {
                        androidx.compose.material3.TextButton(onClick = { vm.preview(a) }) { Text("지금 미리보기") }
                        androidx.compose.material3.TextButton(onClick = { editing = a }) { Text("수정") }
                        Spacer(Modifier.weight(1f))
                        DeleteButton { askDelete(a) }
                    }
                }
            }
        }
    }

    if (adding) AlarmFormDialog(null, { adding = false }) { vm.saveAlarm(it); adding = false }
    editing?.let { AlarmFormDialog(it, { editing = null }) { a -> vm.saveAlarm(a); editing = null } }
}

@Composable
private fun AlarmFormDialog(initial: CounselAlarm?, onDismiss: () -> Unit, onSave: (CounselAlarm) -> Unit) {
    var hour by remember { mutableStateOf(initial?.hour ?: 9) }
    var minute by remember { mutableStateOf(initial?.minute ?: 0) }
    var label by remember { mutableStateOf(initial?.label ?: "오늘의 상담 스킬") }
    var mask by remember { mutableStateOf(initial?.daysMask ?: 127) }
    var category by remember { mutableStateOf(initial?.category ?: "") }
    var fixed by remember { mutableStateOf(initial?.fixedSkillId ?: "") }
    var showTime by remember { mutableStateOf(false) }

    FormDialog(
        title = if (initial == null) "알람 추가" else "알람 수정",
        onDismiss = onDismiss,
        onConfirm = {
            onSave(
                (initial ?: CounselAlarm(hour = hour, minute = minute)).copy(
                    hour = hour, minute = minute, label = label.ifBlank { "오늘의 상담 스킬" },
                    daysMask = if (mask and 127 == 0) 127 else mask,
                    category = category, fixedSkillId = fixed, enabled = true
                )
            )
        }
    ) {
        OutlinedButton(onClick = { showTime = true }, Modifier.fillMaxWidth()) {
            Text(Dt.hm(hour, minute), fontSize = 28.sp)
        }
        AppTextField(label, { label = it }, "알람 이름")
        Text("반복 요일", style = MaterialTheme.typography.bodySmall)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            dayLabels.forEachIndexed { i, d ->
                val on = mask and (1 shl i) != 0
                androidx.compose.material3.FilterChip(
                    selected = on, onClick = { mask = mask xor (1 shl i) },
                    label = { Text(d, fontSize = 12.sp) }
                )
            }
        }
        Text("스킬 분야", style = MaterialTheme.typography.bodySmall)
        val cats = listOf("") + CounselContent.categories.map { it.id }
        ChipSelector(
            cats, category,
            { id -> if (id.isEmpty()) "전체" else CounselContent.categoryOf(id)?.let { "${it.emoji} ${it.title}" } ?: id },
            { category = it; fixed = "" }
        )
        Text("특정 스킬만 계속 받기 (선택)", style = MaterialTheme.typography.bodySmall)
        val pool = CounselContent.skillsIn(category)
        ChipSelector(listOf("") + pool.map { it.id }, fixed, { id -> if (id.isEmpty()) "자동" else CounselContent.skillById(id)?.title ?: id }, { fixed = it })
    }
    if (showTime) {
        HourMinuteDialog(hour, minute, { showTime = false }) { h, m -> hour = h; minute = m; showTime = false }
    }
}

// ═══════════════════════ 상담 일지 ═══════════════════════

private val targets = listOf("아이", "배우자", "양가 어른", "선생님", "의사·전문가", "나 자신")

@Composable
fun CounselJournalScreen(nav: NavController, vm: CounselViewModel = viewModel()) {
    val journals by vm.journals.collectAsState()
    val child = LocalChild.current
    var editing by remember { mutableStateOf<CounselJournal?>(null) }
    var adding by remember { mutableStateOf(false) }
    val askDelete = rememberDeleteTarget<CounselJournal>({ vm.deleteJournal(it) })

    MomScaffold("상담 일지", nav, fabLabel = "일지 쓰기", onFab = { adding = true }) { padding ->
        ListScreen(padding) {
            item {
                InfoBanner("상담 전에 목표를 적고, 상담 후에 잘된 점과 다음에 해볼 것을 적어보세요. 같은 실수를 반복하지 않게 도와줘요.", "📝")
            }
            if (journals.isEmpty()) item { EmptyState("📝", "작성한 상담 일지가 없어요") }
            items(journals.size) { i ->
                val j = journals[i]
                ItemCard(
                    emoji = "📝", title = "${j.target} · ${j.topic}",
                    subtitle = Dt.dateWeek(j.date) + " · 만족도 " + "⭐".repeat(j.satisfaction),
                    detail = listOf(
                        j.goal.takeIf { it.isNotBlank() }?.let { "🎯 $it" },
                        j.whatWentWell.takeIf { it.isNotBlank() }?.let { "👍 $it" },
                        j.nextTime.takeIf { it.isNotBlank() }?.let { "➡️ $it" }
                    ).filterNotNull().joinToString("\n"),
                    onClick = { editing = j },
                    trailing = { DeleteButton { askDelete(j) } }
                )
            }
        }
    }
    if (adding) JournalDialog(null, child?.id, { adding = false }) { vm.saveJournal(it); adding = false }
    editing?.let { JournalDialog(it, child?.id, { editing = null }) { j -> vm.saveJournal(j); editing = null } }
}

@Composable
private fun JournalDialog(initial: CounselJournal?, childId: Long?, onDismiss: () -> Unit, onSave: (CounselJournal) -> Unit) {
    var date by remember { mutableStateOf(initial?.date ?: Dt.now()) }
    var target by remember { mutableStateOf(initial?.target ?: targets.first()) }
    var topic by remember { mutableStateOf(initial?.topic ?: "") }
    var goal by remember { mutableStateOf(initial?.goal ?: "") }
    var good by remember { mutableStateOf(initial?.whatWentWell ?: "") }
    var next by remember { mutableStateOf(initial?.nextTime ?: "") }
    var sat by remember { mutableStateOf(initial?.satisfaction ?: 3) }
    FormDialog(
        title = if (initial == null) "상담 일지" else "일지 수정",
        onDismiss = onDismiss, confirmEnabled = topic.isNotBlank(),
        onConfirm = {
            onSave(
                (initial ?: CounselJournal(date = date, target = target, topic = topic)).copy(
                    date = date, target = target, topic = topic.trim(), goal = goal.trim(),
                    whatWentWell = good.trim(), nextTime = next.trim(), satisfaction = sat,
                    childId = initial?.childId ?: childId
                )
            )
        }
    ) {
        DateField("날짜", date, { date = it })
        Text("상담 대상", style = MaterialTheme.typography.bodySmall)
        ChipSelector(targets, target, { it }, { target = it })
        AppTextField(topic, { topic = it }, "주제 (예: 편식, 등원 거부)")
        AppTextField(goal, { goal = it }, "이번 상담의 목표", singleLine = false, minLines = 2)
        AppTextField(good, { good = it }, "잘된 점", singleLine = false, minLines = 2)
        AppTextField(next, { next = it }, "다음에 해볼 것", singleLine = false, minLines = 2)
        RatingRow("상담 만족도", sat, { sat = it }, listOf("1", "2", "3", "4", "5"))
    }
}
