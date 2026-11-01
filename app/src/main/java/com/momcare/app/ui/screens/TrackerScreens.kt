package com.momcare.app.ui.screens

import android.app.Application
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.momcare.app.content.SolidContent
import com.momcare.app.data.Child
import com.momcare.app.data.DiaperLog
import com.momcare.app.data.DiaperType
import com.momcare.app.data.FeedType
import com.momcare.app.data.FeedingLog
import com.momcare.app.data.FoodReaction
import com.momcare.app.data.SleepLog
import com.momcare.app.data.SleepType
import com.momcare.app.data.SolidFoodLog
import com.momcare.app.data.StoolState
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.AppTextField
import com.momcare.app.ui.components.BarChart
import com.momcare.app.ui.components.BarItem
import com.momcare.app.ui.components.BulletList
import com.momcare.app.ui.components.ChildScaffold
import com.momcare.app.ui.components.ChipSelector
import com.momcare.app.ui.components.DateTimeFields
import com.momcare.app.ui.components.DeleteButton
import com.momcare.app.ui.components.EmptyState
import com.momcare.app.ui.components.FormDialog
import com.momcare.app.ui.components.InfoBanner
import com.momcare.app.ui.components.ItemCard
import com.momcare.app.ui.components.ListScreen
import com.momcare.app.ui.components.NumberField
import com.momcare.app.ui.components.Pill
import com.momcare.app.ui.components.RatingRow
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.SectionHeader
import com.momcare.app.ui.components.StatPill
import com.momcare.app.ui.components.SwitchRow
import com.momcare.app.ui.components.rememberDeleteTarget
import com.momcare.app.util.Dt
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow

// ═══════════════════════ 수유 ═══════════════════════

class FeedingViewModel(app: Application) : BaseViewModel(app) {
    val logs: StateFlow<List<FeedingLog>> = forChild(emptyList()) { db.feedingDao().observeRecent(it, 300) }
    fun save(l: FeedingLog) = io { db.feedingDao().upsert(l) }
    fun delete(l: FeedingLog) = io { db.feedingDao().delete(l) }
}

@Composable
fun FeedingScreen(nav: NavController, vm: FeedingViewModel = viewModel()) {
    val logs by vm.logs.collectAsState()
    var dialog by remember { mutableStateOf<FeedingLog?>(null) }
    var timerStart by remember { mutableStateOf<Long?>(null) }
    var timerSide by remember { mutableStateOf(FeedType.BREAST_LEFT) }
    var tick by remember { mutableStateOf(0L) }
    val askDelete = rememberDeleteTarget<FeedingLog>({ vm.delete(it) })

    LaunchedEffect(timerStart) {
        while (timerStart != null) { tick = Dt.now(); delay(1000) }
    }

    ChildScaffold("수유 기록", nav, fabLabel = "기록 추가", onFab = { c ->
        dialog = FeedingLog(childId = c.id, time = Dt.now(), type = FeedType.FORMULA, amountMl = 120)
    }) { child, padding ->
        val today = logs.filter { it.time >= Dt.todayStart() }
        val totalMl = today.sumOf { it.amountMl }
        val last = logs.firstOrNull()
        val weekly = (6 downTo 0).map { d ->
            val start = Dt.todayStart() - d * Dt.DAY_MS
            BarItem(Dt.short(start), logs.count { it.time in start until start + Dt.DAY_MS }.toFloat())
        }

        ListScreen(padding) {
            item {
                SectionCard(title = "오늘", emoji = "📊") {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("수유 횟수", "${today.size}회", Modifier.weight(1f))
                        StatPill("총 수유량", "${totalMl}ml", Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                        StatPill("마지막", last?.let { Dt.relative(it.time) } ?: "-", Modifier.weight(1.3f), MaterialTheme.colorScheme.tertiary)
                    }
                }
            }
            item {
                SectionCard(title = "모유 수유 타이머", emoji = "⏱️") {
                    if (timerStart == null) {
                        ChipSelector(
                            listOf(FeedType.BREAST_LEFT, FeedType.BREAST_RIGHT), timerSide,
                            { it.label }, { timerSide = it }
                        )
                        Button(onClick = { timerStart = Dt.now() }, Modifier.fillMaxWidth()) { Text("▶ 시작") }
                    } else {
                        val elapsed = (tick.coerceAtLeast(timerStart!!)) - timerStart!!
                        Text(Dt.elapsedClock(elapsed), fontSize = 40.sp, color = MaterialTheme.colorScheme.primary)
                        Text(timerSide.label, style = MaterialTheme.typography.bodyMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {
                                val minutes = (elapsed / 60_000).toInt().coerceAtLeast(1)
                                vm.save(FeedingLog(childId = child.id, time = timerStart!!, type = timerSide, durationMin = minutes))
                                timerStart = null
                            }, Modifier.weight(1f)) { Text("■ 종료 후 저장") }
                            OutlinedButton(onClick = { timerStart = null }, Modifier.weight(1f)) { Text("취소") }
                        }
                    }
                }
            }
            item {
                SectionHeader("빠른 기록")
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(80, 120, 160).forEach { ml ->
                        OutlinedButton(
                            onClick = { vm.save(FeedingLog(childId = child.id, time = Dt.now(), type = FeedType.FORMULA, amountMl = ml)) },
                            Modifier.weight(1f)
                        ) { Text("분유 ${ml}ml") }
                    }
                }
            }
            item {
                SectionCard(title = "최근 7일 수유 횟수", emoji = "📈") { BarChart(weekly, valueLabel = { it.toInt().toString() }) }
            }
            if (logs.isEmpty()) item { EmptyState("🍼", "아직 수유 기록이 없어요") }
            items(logs.take(60), key = { it.id }) { l ->
                ItemCard(
                    emoji = l.type.emoji, title = l.type.label,
                    subtitle = Dt.dateTime(l.time),
                    detail = listOfNotNull(
                        l.amountMl.takeIf { it > 0 }?.let { "${it}ml" },
                        l.durationMin.takeIf { it > 0 }?.let { "${it}분" },
                        l.memo.takeIf { it.isNotBlank() }
                    ).joinToString(" · "),
                    onClick = { dialog = l },
                    trailing = { DeleteButton { askDelete(l) } }
                )
            }
        }
    }

    dialog?.let { l ->
        FeedingDialog(l, onDismiss = { dialog = null }, onSave = { vm.save(it); dialog = null })
    }
}

@Composable
private fun FeedingDialog(initial: FeedingLog, onDismiss: () -> Unit, onSave: (FeedingLog) -> Unit) {
    var time by remember { mutableStateOf(initial.time) }
    var type by remember { mutableStateOf(initial.type) }
    var ml by remember { mutableStateOf(initial.amountMl.takeIf { it > 0 }?.toString() ?: "") }
    var min by remember { mutableStateOf(initial.durationMin.takeIf { it > 0 }?.toString() ?: "") }
    var memo by remember { mutableStateOf(initial.memo) }
    FormDialog("수유 기록", onDismiss, onConfirm = {
        onSave(initial.copy(time = time, type = type, amountMl = ml.toDoubleOrNull()?.toInt() ?: 0,
            durationMin = min.toDoubleOrNull()?.toInt() ?: 0, memo = memo.trim()))
    }) {
        DateTimeFields(time) { time = it }
        ChipSelector(FeedType.entries, type, { it.label }, { type = it })
        if (type == FeedType.BREAST_LEFT || type == FeedType.BREAST_RIGHT) {
            NumberField(min, { min = it }, "수유 시간", "분")
        } else {
            NumberField(ml, { ml = it }, "수유량", "ml")
        }
        AppTextField(memo, { memo = it }, "메모")
    }
}

// ═══════════════════════ 이유식 ═══════════════════════

class SolidViewModel(app: Application) : BaseViewModel(app) {
    val logs: StateFlow<List<SolidFoodLog>> = forChild(emptyList()) { db.solidFoodDao().observeRecent(it, 300) }
    val tried: StateFlow<List<String>> = forChild(emptyList()) { db.solidFoodDao().observeTriedFoods(it) }
    fun save(l: SolidFoodLog) = io { db.solidFoodDao().upsert(l) }
    fun delete(l: SolidFoodLog) = io { db.solidFoodDao().delete(l) }
}

@Composable
fun SolidFoodScreen(nav: NavController, vm: SolidViewModel = viewModel()) {
    val logs by vm.logs.collectAsState()
    val tried by vm.tried.collectAsState()
    var dialog by remember { mutableStateOf<SolidFoodLog?>(null) }
    val askDelete = rememberDeleteTarget<SolidFoodLog>({ vm.delete(it) })

    ChildScaffold("이유식", nav, fabLabel = "기록 추가", onFab = { c ->
        dialog = SolidFoodLog(childId = c.id, time = Dt.now(), foodName = "")
    }) { child, padding ->
        val months = Dt.monthsBetween(child.birthDate)
        val stage = SolidContent.stageFor(months)
        ListScreen(padding) {
            item {
                SectionCard(title = if (stage != null) "${stage.name} 이유식 (${months}개월)" else "이유식 가이드", emoji = "🥣") {
                    if (stage != null) {
                        Text("${stage.form} · ${stage.times}", style = MaterialTheme.typography.bodyLarge)
                        BulletList(stage.tips)
                    } else if (months < 5) {
                        Text("보통 생후 5~6개월부터 시작해요. 목을 가누고 음식에 관심을 보이면 준비 신호예요.", style = MaterialTheme.typography.bodyMedium)
                    } else {
                        Text("완료기 이후에는 가족 식사에 점차 합류해요. 간은 약하게 유지해주세요.", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            item {
                SectionCard(title = "먹어본 재료 ${tried.size}가지", emoji = "✅") {
                    Text(
                        if (tried.isEmpty()) "아직 없어요" else tried.joinToString(", "),
                        style = MaterialTheme.typography.bodyMedium
                    )
                    val suggestions = SolidContent.starterFoods.filter { it !in tried }.take(8)
                    if (suggestions.isNotEmpty()) {
                        Text("다음 도전 추천: ${suggestions.joinToString(", ")}", style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            item { InfoBanner("주의 식품: " + SolidContent.avoid.joinToString(" / "), "⚠️", warn = true) }
            if (logs.isEmpty()) item { EmptyState("🥄", "이유식 기록이 없어요") }
            items(logs.take(80), key = { it.id }) { l ->
                ItemCard(
                    emoji = l.reaction.emoji, title = l.foodName + if (l.isFirstTry) "  (처음)" else "",
                    subtitle = "${Dt.dateTime(l.time)} · ${l.reaction.label}",
                    detail = listOfNotNull(l.stage.takeIf { it.isNotBlank() }, l.amountText.takeIf { it.isNotBlank() }, l.memo.takeIf { it.isNotBlank() }).joinToString(" · "),
                    onClick = { dialog = l },
                    trailing = { DeleteButton { askDelete(l) } }
                )
            }
        }
        dialog?.let { l ->
            var foodName by remember(l) { mutableStateOf(l.foodName) }
            var time by remember(l) { mutableStateOf(l.time) }
            var amount by remember(l) { mutableStateOf(l.amountText) }
            var reaction by remember(l) { mutableStateOf(l.reaction) }
            var first by remember(l) { mutableStateOf(l.isFirstTry || (l.id == 0L && true)) }
            var memo by remember(l) { mutableStateOf(l.memo) }
            FormDialog("이유식 기록", { dialog = null }, confirmEnabled = foodName.isNotBlank(), onConfirm = {
                val isNew = foodName.trim() !in tried
                vm.save(l.copy(foodName = foodName.trim(), time = time, amountText = amount.trim(), reaction = reaction,
                    stage = stage?.name ?: "", isFirstTry = first && isNew, memo = memo.trim()))
                dialog = null
            }) {
                DateTimeFields(time) { time = it }
                AppTextField(foodName, { foodName = it }, "재료/메뉴")
                ChipSelector(SolidContent.starterFoods, null, { it }, { foodName = it })
                AppTextField(amount, { amount = it }, "먹은 양 (예: 3큰술)")
                Text("반응", style = MaterialTheme.typography.bodySmall)
                ChipSelector(FoodReaction.entries, reaction, { "${it.emoji} ${it.label}" }, { reaction = it })
                SwitchRow("새로운 재료예요", first, { first = it })
                AppTextField(memo, { memo = it }, "메모")
            }
        }
    }
}

// ═══════════════════════ 수면 ═══════════════════════

class SleepViewModel(app: Application) : BaseViewModel(app) {
    val logs: StateFlow<List<SleepLog>> = forChild(emptyList()) { db.sleepDao().observeRecent(it, 200) }
    val ongoing: StateFlow<SleepLog?> = forChild(null) { db.sleepDao().observeOngoing(it) }
    fun save(l: SleepLog) = io { db.sleepDao().upsert(l) }
    fun delete(l: SleepLog) = io { db.sleepDao().delete(l) }

    fun start(childId: Long) = io {
        val h = Dt.hour(Dt.now())
        val type = if (h >= 19 || h < 6) SleepType.NIGHT else SleepType.NAP
        db.sleepDao().upsert(SleepLog(childId = childId, startTime = Dt.now(), type = type))
    }

    fun stop(log: SleepLog, quality: Int) = io {
        db.sleepDao().upsert(log.copy(endTime = Dt.now(), quality = quality))
    }
}

@Composable
fun SleepScreen(nav: NavController, vm: SleepViewModel = viewModel()) {
    val logs by vm.logs.collectAsState()
    val ongoing by vm.ongoing.collectAsState()
    var dialog by remember { mutableStateOf<SleepLog?>(null) }
    var quality by remember { mutableStateOf(3) }
    var tick by remember { mutableStateOf(Dt.now()) }
    val askDelete = rememberDeleteTarget<SleepLog>({ vm.delete(it) })

    LaunchedEffect(ongoing?.id) {
        while (ongoing != null) { tick = Dt.now(); delay(1000) }
    }

    ChildScaffold("수면 기록", nav, fabLabel = "직접 입력", onFab = { c ->
        dialog = SleepLog(childId = c.id, startTime = Dt.now() - 3_600_000, endTime = Dt.now())
    }) { child, padding ->
        val daily = (6 downTo 0).map { d ->
            val start = Dt.todayStart() - d * Dt.DAY_MS
            val ms = logs.filter { it.startTime in start until start + Dt.DAY_MS }.sumOf { (it.endTime ?: it.startTime) - it.startTime }
            BarItem(Dt.short(start), ms / 3_600_000f)
        }
        val avg = daily.map { it.value }.filter { it > 0 }.let { if (it.isEmpty()) 0f else it.average().toFloat() }

        ListScreen(padding) {
            item {
                SectionCard(title = if (ongoing == null) "잠들었어요?" else "자는 중 💤", emoji = "🌙") {
                    val o = ongoing
                    if (o == null) {
                        Button(onClick = { vm.start(child.id) }, Modifier.fillMaxWidth()) { Text("😴 수면 시작") }
                    } else {
                        Text(Dt.elapsedClock(tick - o.startTime), fontSize = 40.sp, color = MaterialTheme.colorScheme.primary)
                        Text("${Dt.time(o.startTime)}부터 · ${o.type.label}", style = MaterialTheme.typography.bodyMedium)
                        RatingRow("잠의 질", quality, { quality = it })
                        Button(onClick = { vm.stop(o, quality) }, Modifier.fillMaxWidth()) { Text("☀️ 깼어요 (종료)") }
                    }
                }
            }
            item {
                SectionCard(title = "최근 7일 수면 시간 (평균 %.1f시간)".format(avg), emoji = "📊") {
                    BarChart(daily, valueLabel = { "%.1f".format(it) }, defaultColor = MaterialTheme.colorScheme.secondary)
                }
            }
            if (logs.isEmpty()) item { EmptyState("🌙", "수면 기록이 없어요") }
            items(logs.take(60), key = { it.id }) { l ->
                val end = l.endTime
                ItemCard(
                    emoji = l.type.emoji,
                    title = if (end == null) "자는 중" else Dt.durationText(end - l.startTime),
                    subtitle = "${Dt.dateWeek(l.startTime)} ${Dt.time(l.startTime)}" + (end?.let { " → ${Dt.time(it)}" } ?: ""),
                    detail = "${l.type.label} · 잠의 질 ${"⭐".repeat(l.quality)}",
                    onClick = { dialog = l },
                    trailing = { DeleteButton { askDelete(l) } }
                )
            }
        }
    }

    dialog?.let { l ->
        var start by remember(l) { mutableStateOf(l.startTime) }
        var end by remember(l) { mutableStateOf(l.endTime ?: Dt.now()) }
        var type by remember(l) { mutableStateOf(l.type) }
        var q by remember(l) { mutableStateOf(l.quality) }
        FormDialog("수면 기록", { dialog = null }, confirmEnabled = end > start, onConfirm = {
            vm.save(l.copy(startTime = start, endTime = end, type = type, quality = q)); dialog = null
        }) {
            Text("시작", style = MaterialTheme.typography.bodySmall)
            DateTimeFields(start) { start = it }
            Text("종료", style = MaterialTheme.typography.bodySmall)
            DateTimeFields(end) { end = it }
            ChipSelector(SleepType.entries, type, { it.label }, { type = it })
            RatingRow("잠의 질", q, { q = it })
        }
    }
}

// ═══════════════════════ 기저귀 ═══════════════════════

class DiaperViewModel(app: Application) : BaseViewModel(app) {
    val logs: StateFlow<List<DiaperLog>> = forChild(emptyList()) { db.diaperDao().observeRecent(it, 300) }
    fun save(l: DiaperLog) = io { db.diaperDao().upsert(l) }
    fun delete(l: DiaperLog) = io { db.diaperDao().delete(l) }
}

@Composable
fun DiaperScreen(nav: NavController, vm: DiaperViewModel = viewModel()) {
    val logs by vm.logs.collectAsState()
    var dialog by remember { mutableStateOf<DiaperLog?>(null) }
    val askDelete = rememberDeleteTarget<DiaperLog>({ vm.delete(it) })

    ChildScaffold("기저귀·배변", nav, fabLabel = "상세 기록", onFab = { c ->
        dialog = DiaperLog(childId = c.id, time = Dt.now(), type = DiaperType.PEE)
    }) { child, padding ->
        val today = logs.filter { it.time >= Dt.todayStart() }
        val pee = today.count { it.type == DiaperType.PEE || it.type == DiaperType.BOTH }
        val poo = today.count { it.type == DiaperType.POO || it.type == DiaperType.BOTH }
        val warn = logs.take(5).any { it.stool == StoolState.BLOODY || it.stool == StoolState.WHITE }
        ListScreen(padding) {
            item {
                SectionCard(title = "오늘", emoji = "📊") {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("전체", "${today.size}회", Modifier.weight(1f))
                        StatPill("소변", "${pee}회", Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                        StatPill("대변", "${poo}회", Modifier.weight(1f), MaterialTheme.colorScheme.tertiary)
                    }
                }
            }
            if (warn) item { InfoBanner("최근 대변 색이 걱정되는 기록이 있어요. 혈변이나 흰색/회색 변은 소아과 진료가 필요해요.", "⚠️", true) }
            item { SectionHeader("한 번에 기록") }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    DiaperType.entries.forEach { t ->
                        OutlinedButton(
                            onClick = { vm.save(DiaperLog(childId = child.id, time = Dt.now(), type = t)) },
                            Modifier.weight(1f), contentPadding = androidx.compose.foundation.layout.PaddingValues(4.dp)
                        ) { Text("${t.emoji}\n${t.label}", fontSize = 11.sp, maxLines = 2, textAlign = androidx.compose.ui.text.style.TextAlign.Center) }
                    }
                }
            }
            if (logs.isEmpty()) item { EmptyState("🧷", "기저귀 기록이 없어요") }
            items(logs.take(80), key = { it.id }) { l ->
                ItemCard(
                    emoji = l.type.emoji, title = l.type.label,
                    subtitle = Dt.dateTime(l.time),
                    detail = listOfNotNull(
                        l.stool.takeIf { it != StoolState.NORMAL && l.type != DiaperType.PEE && l.type != DiaperType.DRY }?.label,
                        if (l.rash) "발진" else null, l.memo.takeIf { it.isNotBlank() }
                    ).joinToString(" · "),
                    onClick = { dialog = l },
                    trailing = { DeleteButton { askDelete(l) } }
                )
            }
        }
    }

    dialog?.let { l ->
        var time by remember(l) { mutableStateOf(l.time) }
        var type by remember(l) { mutableStateOf(l.type) }
        var stool by remember(l) { mutableStateOf(l.stool) }
        var rash by remember(l) { mutableStateOf(l.rash) }
        var memo by remember(l) { mutableStateOf(l.memo) }
        FormDialog("기저귀 기록", { dialog = null }, onConfirm = {
            vm.save(l.copy(time = time, type = type, stool = stool, rash = rash, memo = memo.trim())); dialog = null
        }) {
            DateTimeFields(time) { time = it }
            ChipSelector(DiaperType.entries, type, { "${it.emoji} ${it.label}" }, { type = it })
            if (type == DiaperType.POO || type == DiaperType.BOTH) {
                Text("대변 상태", style = MaterialTheme.typography.bodySmall)
                ChipSelector(StoolState.entries, stool, { it.label }, { stool = it })
            }
            SwitchRow("엉덩이 발진", rash, { rash = it })
            AppTextField(memo, { memo = it }, "메모")
        }
    }
}
