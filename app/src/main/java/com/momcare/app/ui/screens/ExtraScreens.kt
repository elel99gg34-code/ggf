@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.momcare.app.ui.screens

import android.app.Application
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.momcare.app.content.BookContent
import com.momcare.app.content.ChecklistTemplates
import com.momcare.app.content.HabitContent
import com.momcare.app.content.PregnancyContent
import com.momcare.app.content.RecipeContent
import com.momcare.app.content.SupplyContent
import com.momcare.app.data.BookLog
import com.momcare.app.data.ChecklistItem
import com.momcare.app.data.Contraction
import com.momcare.app.data.FeedingLog
import com.momcare.app.data.Habit
import com.momcare.app.data.HabitLog
import com.momcare.app.data.HandoverNote
import com.momcare.app.data.KickSession
import com.momcare.app.data.Recipe
import com.momcare.app.data.SleepLog
import com.momcare.app.data.SleepType
import com.momcare.app.data.StickerLog
import com.momcare.app.data.Supply
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.AppTextField
import com.momcare.app.ui.components.BarChart
import com.momcare.app.ui.components.BarItem
import com.momcare.app.ui.components.BulletList
import com.momcare.app.ui.components.ChildScaffold
import com.momcare.app.ui.components.ChipSelector
import com.momcare.app.ui.components.DateField
import com.momcare.app.ui.components.DeleteButton
import com.momcare.app.ui.components.EmptyState
import com.momcare.app.ui.components.FormDialog
import com.momcare.app.ui.components.InfoBanner
import com.momcare.app.ui.components.ItemCard
import com.momcare.app.ui.components.ListScreen
import com.momcare.app.ui.components.LocalChild
import com.momcare.app.ui.components.LocalChildren
import com.momcare.app.ui.components.MomScaffold
import com.momcare.app.ui.components.NumberField
import com.momcare.app.ui.components.Pill
import com.momcare.app.ui.components.ProgressBar
import com.momcare.app.ui.components.RatingRow
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.SectionHeader
import com.momcare.app.ui.components.StatPill
import com.momcare.app.ui.components.rememberDeleteTarget
import com.momcare.app.util.Dt
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow
import kotlin.math.roundToInt

// ═══════════════════════ 1. 진통 타이머 ═══════════════════════

class PregnancyViewModel(app: Application) : BaseViewModel(app) {
    val contractions: StateFlow<List<Contraction>> = db.pregnancyDao().observeContractions(50).asState(emptyList())
    val kicks: StateFlow<List<KickSession>> = db.pregnancyDao().observeKicks(30).asState(emptyList())
    val dueDate: StateFlow<Long> = prefs.dueDate

    fun setDueDate(ms: Long) = prefs.setDueDate(ms)

    fun startContraction() = io { db.pregnancyDao().upsertContraction(Contraction(startTime = Dt.now())) }
    fun stopContraction(c: Contraction, intensity: Int) = io {
        db.pregnancyDao().upsertContraction(c.copy(endTime = Dt.now(), intensity = intensity))
    }
    fun deleteContraction(c: Contraction) = io { db.pregnancyDao().deleteContraction(c) }
    fun clearContractions() = io { db.pregnancyDao().clearContractions() }

    fun startKicks() = io { db.pregnancyDao().upsertKick(KickSession(startTime = Dt.now())) }
    fun kick(k: KickSession) = io { db.pregnancyDao().upsertKick(k.copy(count = k.count + 1)) }
    fun endKicks(k: KickSession) = io { db.pregnancyDao().upsertKick(k.copy(endTime = Dt.now())) }
    fun deleteKick(k: KickSession) = io { db.pregnancyDao().deleteKick(k) }
}

@Composable
fun ContractionScreen(nav: NavController, vm: PregnancyViewModel = viewModel()) {
    val list by vm.contractions.collectAsState()
    val ongoing = list.firstOrNull { it.endTime == null }
    var intensity by remember { mutableStateOf(3) }
    var tick by remember { mutableStateOf(Dt.now()) }
    val askDelete = rememberDeleteTarget<Contraction>({ vm.deleteContraction(it) })
    var askClear by remember { mutableStateOf(false) }

    LaunchedEffect(ongoing?.id) { while (ongoing != null) { tick = Dt.now(); delay(500) } }

    // 최근 1시간 통계
    val done = list.filter { it.endTime != null }
    val recent = done.filter { it.startTime > Dt.now() - 60 * 60_000 }
    val intervals = done.zipWithNext { newer, older -> newer.startTime - older.startTime }.take(6)
    val avgInterval = if (intervals.isEmpty()) 0L else intervals.average().toLong()
    val avgDuration = if (recent.isEmpty()) 0L else recent.map { it.endTime!! - it.startTime }.average().toLong()
    val fiveOneOne = recent.size >= 6 && avgInterval in 1..(5 * 60_000 + 30_000) && avgDuration >= 45_000

    MomScaffold("진통 타이머", nav, actions = { TextButton(onClick = { askClear = true }) { Text("초기화") } }) { padding ->
        ListScreen(padding) {
            if (fiveOneOne) item { InfoBanner("5-1-1 기준에 가까워요! 병원에 연락하고 출발 준비를 하세요.", "🚨", true) }
            item {
                SectionCard(title = if (ongoing == null) "진통이 시작되면 누르세요" else "진통 중", emoji = "⏱️") {
                    if (ongoing == null) {
                        Button(onClick = { vm.startContraction() }, Modifier.fillMaxWidth().height(72.dp)) { Text("진통 시작", fontSize = 20.sp) }
                    } else {
                        Text(Dt.elapsedClock(tick - ongoing.startTime), fontSize = 44.sp, color = MaterialTheme.colorScheme.error)
                        RatingRow("강도", intensity, { intensity = it }, listOf("1", "2", "3", "4", "5"))
                        Button(onClick = { vm.stopContraction(ongoing, intensity) }, Modifier.fillMaxWidth().height(72.dp)) { Text("진통 끝", fontSize = 20.sp) }
                    }
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatPill("평균 간격", if (avgInterval > 0) Dt.durationText(avgInterval).ifBlank { "-" } else "-", Modifier.weight(1f))
                    StatPill("평균 지속", if (avgDuration > 0) "${avgDuration / 1000}초" else "-", Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                    StatPill("최근 1시간", "${recent.size}회", Modifier.weight(1f), MaterialTheme.colorScheme.tertiary)
                }
            }
            item { SectionCard(title = "병원 가야 할 때", emoji = "🏥") { BulletList(PregnancyContent.contractionRules) } }
            if (done.isEmpty()) item { EmptyState("⏱️", "기록된 진통이 없어요") }
            items(done.take(30), key = { it.id }) { c ->
                val idx = done.indexOf(c)
                val interval = done.getOrNull(idx + 1)?.let { c.startTime - it.startTime }
                ItemCard(
                    "🌊", "${(c.endTime!! - c.startTime) / 1000}초 지속",
                    "${Dt.time(c.startTime)} · 강도 ${c.intensity}" + (interval?.let { " · 간격 ${Dt.durationText(it)}" } ?: ""),
                    trailing = { DeleteButton { askDelete(c) } }
                )
            }
        }
    }
    if (askClear) {
        com.momcare.app.ui.components.ConfirmDialog("진통 기록을 모두 지울까요?", "새로 측정을 시작할 때 사용하세요.", { askClear = false }, { vm.clearContractions() })
    }
}

// ═══════════════════════ 2. 임신 주차·태동 ═══════════════════════

@Composable
fun PregnancyScreen(nav: NavController, vm: PregnancyViewModel = viewModel()) {
    val due by vm.dueDate.collectAsState()
    val kicks by vm.kicks.collectAsState()
    val active = kicks.firstOrNull { it.endTime == null }
    var tick by remember { mutableStateOf(Dt.now()) }
    LaunchedEffect(active?.id) { while (active != null) { tick = Dt.now(); delay(1000) } }

    MomScaffold("임신 주차·태동", nav) { padding ->
        ListScreen(padding) {
            item {
                SectionCard(title = "출산 예정일", emoji = "🤰") {
                    DateField("예정일", if (due > 0) due else Dt.todayStart() + 180 * Dt.DAY_MS, { vm.setDueDate(it) })
                    if (due > 0) {
                        val daysLeft = Dt.dDay(due)
                        val daysPregnant = PregnancyContent.TOTAL_DAYS - daysLeft
                        val week = (daysPregnant / 7).coerceIn(0, 42)
                        val day = (daysPregnant % 7).coerceAtLeast(0)
                        Text("임신 ${week}주 ${day}일 · ${Dt.dDayText(daysLeft)}", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
                        ProgressBar(daysPregnant.toFloat() / PregnancyContent.TOTAL_DAYS)
                        val info = PregnancyContent.infoFor(week)
                        Text("👶 아기 크기: ${info.babySize}", style = MaterialTheme.typography.titleMedium)
                        Text("아기: ${info.baby}", style = MaterialTheme.typography.bodyMedium)
                        Text("엄마: ${info.mom}", style = MaterialTheme.typography.bodyMedium)
                        SectionHeader("이 시기에 할 일")
                        BulletList(info.todo, "☐")
                        OutlinedButton(onClick = { nav.navigate(com.momcare.app.ui.nav.Routes.CONTRACTION) }, Modifier.fillMaxWidth()) { Text("⏱️ 진통 타이머 열기") }
                    } else {
                        Text("예정일을 입력하면 주차별 정보를 보여드려요.", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            item {
                SectionCard(title = "태동 카운터", emoji = "🦶") {
                    if (active == null) {
                        BulletList(PregnancyContent.kickGuide)
                        Button(onClick = { vm.startKicks() }, Modifier.fillMaxWidth()) { Text("세기 시작") }
                    } else {
                        Text("${active.count}번", fontSize = 48.sp, color = MaterialTheme.colorScheme.primary)
                        Text("경과 ${Dt.elapsedClock(tick - active.startTime)}", style = MaterialTheme.typography.bodyMedium)
                        if (active.count >= 10) InfoBanner("10번 달성! 오늘도 아기가 건강하게 움직이고 있어요.", "🎉")
                        Box(
                            Modifier.fillMaxWidth().height(96.dp).clip(MaterialTheme.shapes.large)
                                .background(MaterialTheme.colorScheme.primaryContainer).clickable { vm.kick(active) },
                            contentAlignment = Alignment.Center
                        ) { Text("👣 움직였어요! (탭)", fontSize = 20.sp) }
                        OutlinedButton(onClick = { vm.endKicks(active) }, Modifier.fillMaxWidth()) { Text("세기 종료") }
                    }
                }
            }
            val past = kicks.filter { it.endTime != null }
            if (past.isNotEmpty()) item { SectionHeader("태동 기록") }
            items(past, key = { it.id }) { k ->
                ItemCard("🦶", "${k.count}번 / ${Dt.durationText(k.endTime!! - k.startTime)}", Dt.dateTime(k.startTime),
                    trailing = { DeleteButton { vm.deleteKick(k) } })
            }
        }
    }
}

// ═══════════════════════ 3. 돌봄 인수인계 노트 ═══════════════════════

class HandoverViewModel(app: Application) : BaseViewModel(app) {
    val notes: StateFlow<List<HandoverNote>> = db.handoverDao().observeAll().asState(emptyList())
    val allergies = forChild(emptyList()) { db.allergyDao().observe(it) }
    val contacts = db.emergencyContactDao().observeAll().asState(emptyList())
    fun save(n: HandoverNote) = io { db.handoverDao().upsert(n.copy(updatedAt = Dt.now())) }
    fun delete(n: HandoverNote) = io { db.handoverDao().delete(n) }
}

@Composable
fun HandoverScreen(nav: NavController, vm: HandoverViewModel = viewModel()) {
    val notes by vm.notes.collectAsState()
    val allergies by vm.allergies.collectAsState()
    val contacts by vm.contacts.collectAsState()
    val child = LocalChild.current
    val children = LocalChildren.current
    val ctx = LocalContext.current
    var dialog by remember { mutableStateOf<HandoverNote?>(null) }
    val askDelete = rememberDeleteTarget<HandoverNote>({ vm.delete(it) })

    fun share(n: HandoverNote) {
        val c = children.firstOrNull { it.id == n.childId }
        val text = buildString {
            appendLine("📋 ${n.title}")
            c?.let { appendLine("👶 ${it.name} (${Dt.ageText(it.birthDate)})") }
            if (n.routine.isNotBlank()) appendLine("\n⏰ 하루 일과\n${n.routine}")
            if (n.food.isNotBlank()) appendLine("\n🍼 먹는 것\n${n.food}")
            if (n.sleep.isNotBlank()) appendLine("\n🌙 재우기\n${n.sleep}")
            if (n.health.isNotBlank()) appendLine("\n💊 건강·약\n${n.health}")
            if (allergies.isNotEmpty() && c?.id == child?.id) appendLine("\n⚠️ 알레르기: " + allergies.joinToString { "${it.allergen}(${it.severity.label})" })
            if (n.rules.isNotBlank()) appendLine("\n📌 우리 집 규칙\n${n.rules}")
            if (n.emergency.isNotBlank()) appendLine("\n🚑 비상시\n${n.emergency}")
            if (contacts.isNotEmpty()) appendLine("\n📞 연락처\n" + contacts.joinToString("\n") { "${it.name}(${it.relation}) ${it.phone}" })
            append("\n긴급: 119")
        }
        val send = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, text) }
        ctx.startActivity(Intent.createChooser(send, "인수인계 노트 공유"))
    }

    MomScaffold("돌봄 인수인계 노트", nav, fabLabel = "노트 만들기", onFab = {
        dialog = HandoverNote(childId = child?.id, title = "${child?.name ?: "아이"} 돌봄 안내")
    }) { padding ->
        ListScreen(padding) {
            item { InfoBanner("할머니·할아버지, 베이비시터에게 아이를 맡길 때 필요한 정보를 한 번에 정리해 공유하세요. 알레르기와 비상 연락처가 자동으로 포함돼요.", "📋") }
            if (notes.isEmpty()) item { EmptyState("📋", "인수인계 노트가 없어요") }
            items(notes, key = { it.id }) { n ->
                SectionCard(title = n.title, emoji = "📋") {
                    Text("마지막 수정 ${Dt.dateTime(n.updatedAt)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    listOf("⏰" to n.routine, "🍼" to n.food, "🌙" to n.sleep).filter { it.second.isNotBlank() }.forEach { (e, t) ->
                        Text("$e $t", style = MaterialTheme.typography.bodyMedium, maxLines = 2)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { share(n) }) { Text("공유하기") }
                        OutlinedButton(onClick = { dialog = n }) { Text("수정") }
                        Spacer(Modifier.weight(1f))
                        DeleteButton { askDelete(n) }
                    }
                }
            }
        }
    }

    dialog?.let { n ->
        var title by remember(n) { mutableStateOf(n.title) }
        var routine by remember(n) { mutableStateOf(n.routine) }
        var food by remember(n) { mutableStateOf(n.food) }
        var sleep by remember(n) { mutableStateOf(n.sleep) }
        var health by remember(n) { mutableStateOf(n.health) }
        var rules by remember(n) { mutableStateOf(n.rules) }
        var emergency by remember(n) { mutableStateOf(n.emergency) }
        FormDialog("인수인계 노트", { dialog = null }, confirmEnabled = title.isNotBlank(), onConfirm = {
            vm.save(n.copy(title = title.trim(), routine = routine.trim(), food = food.trim(), sleep = sleep.trim(),
                health = health.trim(), rules = rules.trim(), emergency = emergency.trim()))
            dialog = null
        }) {
            AppTextField(title, { title = it }, "제목")
            AppTextField(routine, { routine = it }, "하루 일과 (기상·낮잠·식사 시간)", singleLine = false, minLines = 3)
            AppTextField(food, { food = it }, "먹는 것 (분유량, 간식, 주의 음식)", singleLine = false, minLines = 2)
            AppTextField(sleep, { sleep = it }, "재우는 방법 (애착인형, 자장가 등)", singleLine = false, minLines = 2)
            AppTextField(health, { health = it }, "건강·약 (복용 중인 약, 체온 기준)", singleLine = false, minLines = 2)
            AppTextField(rules, { rules = it }, "우리 집 규칙 (영상 시간, 간식 규칙)", singleLine = false, minLines = 2)
            AppTextField(emergency, { emergency = it }, "비상시 행동 (가까운 병원 등)", singleLine = false, minLines = 2)
        }
    }
}

// ═══════════════════════ 4. 소모품 재고 ═══════════════════════

class SupplyViewModel(app: Application) : BaseViewModel(app) {
    val items: StateFlow<List<Supply>> = db.supplyDao().observeAll().asState(emptyList())
    val showDiaper: StateFlow<Boolean> = prefs.showDiaper
    fun save(s: Supply) = io { db.supplyDao().upsert(s.copy(updatedAt = Dt.now())) }
    fun delete(s: Supply) = io { db.supplyDao().delete(s) }
    fun adjust(s: Supply, delta: Double) = save(s.copy(stock = (s.stock + delta).coerceAtLeast(0.0)))
    fun loadDefaults() = io { if (db.supplyDao().count() == 0) db.supplyDao().insertAll(SupplyContent.defaults) }
    fun addToShopping(s: Supply) = io {
        db.shoppingDao().upsert(com.momcare.app.data.ShoppingItem(name = s.name, category = com.momcare.app.data.ShoppingCategory.BABY))
    }
}

/** 마지막 수정 이후 사용량을 반영한 현재 예상 재고 */
fun Supply.estimatedStock(): Double {
    val days = (Dt.now() - updatedAt) / Dt.DAY_MS.toDouble()
    return (stock - dailyUse * days).coerceAtLeast(0.0)
}

@Composable
fun SupplyScreen(nav: NavController, vm: SupplyViewModel = viewModel()) {
    val all by vm.items.collectAsState()
    val showDiaper by vm.showDiaper.collectAsState()
    val items = all.filter { showDiaper || !it.diaperRelated }
    var dialog by remember { mutableStateOf<Supply?>(null) }
    val askDelete = rememberDeleteTarget<Supply>({ vm.delete(it) })

    MomScaffold("육아 소모품 재고", nav, fabLabel = "품목 추가", onFab = { dialog = Supply(name = "") }) { padding ->
        val low = items.filter { it.estimatedStock() <= it.lowThreshold }
        ListScreen(padding) {
            if (all.isEmpty()) {
                item { EmptyState("📦", "관리 중인 소모품이 없어요") }
                item { Button(onClick = { vm.loadDefaults() }, Modifier.fillMaxWidth()) { Text("기본 소모품 목록 불러오기") } }
            }
            if (low.isNotEmpty()) item { InfoBanner("곧 떨어지는 품목: " + low.joinToString { it.name }, "⚠️", true) }
            items(items, key = { it.id }) { s ->
                val est = s.estimatedStock()
                val daysLeft = if (s.dailyUse > 0) (est / s.dailyUse).toInt() else null
                SectionCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(s.emoji, fontSize = 26.sp)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f).clickable { dialog = s }) {
                            Text(s.name, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "약 ${"%.1f".format(est)}${s.unit} 남음" + (daysLeft?.let { " · 약 ${it}일 사용 가능" } ?: ""),
                                style = MaterialTheme.typography.bodySmall,
                                color = if (est <= s.lowThreshold) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        DeleteButton { askDelete(s) }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        OutlinedButton(onClick = { vm.save(s.copy(stock = est - 1).let { it.copy(stock = it.stock.coerceAtLeast(0.0)) }) }) { Text("-1") }
                        OutlinedButton(onClick = { vm.save(s.copy(stock = est + 1)) }) { Text("+1") }
                        OutlinedButton(onClick = { vm.save(s.copy(stock = est + 10)) }) { Text("+10") }
                        TextButton(onClick = { vm.addToShopping(s) }) { Text("🛒 장보기") }
                    }
                }
            }
        }
    }

    dialog?.let { s ->
        var name by remember(s) { mutableStateOf(s.name) }
        var emoji by remember(s) { mutableStateOf(s.emoji) }
        var unit by remember(s) { mutableStateOf(s.unit) }
        var stock by remember(s) { mutableStateOf(if (s.id == 0L) "" else "%.1f".format(s.estimatedStock())) }
        var daily by remember(s) { mutableStateOf(if (s.dailyUse > 0) s.dailyUse.toString() else "") }
        var low by remember(s) { mutableStateOf(if (s.lowThreshold > 0) s.lowThreshold.toString() else "") }
        FormDialog("소모품", { dialog = null }, confirmEnabled = name.isNotBlank(), onConfirm = {
            vm.save(s.copy(name = name.trim(), emoji = emoji, unit = unit.ifBlank { "개" }, stock = stock.toDoubleOrNull() ?: 0.0,
                dailyUse = daily.toDoubleOrNull() ?: 0.0, lowThreshold = low.toDoubleOrNull() ?: 0.0))
            dialog = null
        }) {
            AppTextField(name, { name = it }, "품목")
            ChipSelector(listOf("📦", "🍼", "🧻", "🧴", "🫧", "💊", "🧦"), emoji, { it }, { emoji = it })
            AppTextField(unit, { unit = it }, "단위 (개, 팩, 통)")
            NumberField(stock, { stock = it }, "현재 수량")
            NumberField(daily, { daily = it }, "하루 평균 사용량")
            NumberField(low, { low = it }, "이 수량 이하면 알려주기")
        }
    }
}

// ═══════════════════════ 5. 수유·수면 패턴 분석 ═══════════════════════

class PatternViewModel(app: Application) : BaseViewModel(app) {
    val feedings: StateFlow<List<FeedingLog>> = forChild(emptyList()) { db.feedingDao().observeRecent(it, 400) }
    val sleeps: StateFlow<List<SleepLog>> = forChild(emptyList()) { db.sleepDao().observeRecent(it, 200) }
}

@Composable
fun PatternScreen(nav: NavController, vm: PatternViewModel = viewModel()) {
    val feedingsAll by vm.feedings.collectAsState()
    val sleepsAll by vm.sleeps.collectAsState()
    ChildScaffold("수유·수면 패턴 분석", nav) { child, padding ->
        val since = Dt.todayStart() - 7 * Dt.DAY_MS
        val feedings = feedingsAll.filter { it.time >= since }.sortedBy { it.time }
        val sleeps = sleepsAll.filter { it.startTime >= since && it.endTime != null }
        val intervals = feedings.zipWithNext { a, b -> b.time - a.time }.filter { it in 20 * 60_000L..8 * 3_600_000L }
        val avgInterval = if (intervals.isEmpty()) 0L else intervals.average().toLong()
        val nextFeed = feedingsAll.firstOrNull()?.let { last -> if (avgInterval > 0) last.time + avgInterval else null }
        val perDay = feedings.size / 7.0
        val mlPerDay = feedings.sumOf { it.amountMl } / 7.0
        val buckets = (0 until 6).map { b ->
            BarItem("${b * 4}시", feedings.count { Dt.hour(it.time) / 4 == b }.toFloat())
        }
        val naps = sleeps.filter { it.type == SleepType.NAP }
        val nights = sleeps.filter { it.type == SleepType.NIGHT }
        val avgNap = if (naps.isEmpty()) 0L else naps.map { it.endTime!! - it.startTime }.average().toLong()
        val longestNight = nights.maxOfOrNull { it.endTime!! - it.startTime } ?: 0L
        val bedtimes = nights.map { Dt.hour(it.startTime) * 60 + Dt.minute(it.startTime) }.map { if (it < 12 * 60) it + 24 * 60 else it }
        val avgBed = if (bedtimes.isEmpty()) null else (bedtimes.average().roundToInt() % (24 * 60))

        ListScreen(padding) {
            item { InfoBanner("최근 7일 기록으로 분석했어요. 기록이 많을수록 정확해져요.", "🔍") }
            item {
                SectionCard(title = "수유 패턴", emoji = "🍼") {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("평균 간격", if (avgInterval > 0) Dt.durationText(avgInterval) else "-", Modifier.weight(1f))
                        StatPill("하루 횟수", "%.1f회".format(perDay), Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                        StatPill("하루 수유량", "${mlPerDay.toInt()}ml", Modifier.weight(1f), MaterialTheme.colorScheme.tertiary)
                    }
                    nextFeed?.let {
                        Text(
                            if (it > Dt.now()) "⏰ 다음 수유 예상: ${Dt.time(it)} (${Dt.durationText(it - Dt.now())} 후)"
                            else "⏰ 평소 간격으로 보면 지금쯤 배고플 수 있어요",
                            style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary
                        )
                    }
                    Text("시간대별 수유", style = MaterialTheme.typography.bodySmall)
                    BarChart(buckets)
                }
            }
            item {
                SectionCard(title = "수면 패턴", emoji = "🌙") {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("평균 낮잠", if (avgNap > 0) Dt.durationText(avgNap) else "-", Modifier.weight(1f))
                        StatPill("가장 긴 밤잠", if (longestNight > 0) Dt.durationText(longestNight) else "-", Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                    }
                    avgBed?.let { Text("🛏️ 평균 잠드는 시각: ${Dt.hm(it / 60, it % 60)}", style = MaterialTheme.typography.bodyLarge) }
                    val months = Dt.monthsBetween(child.birthDate)
                    val recommended = when {
                        months < 4 -> "14~17시간"
                        months < 12 -> "12~16시간 (낮잠 포함)"
                        months < 36 -> "11~14시간 (낮잠 포함)"
                        else -> "10~13시간"
                    }
                    Text("${Dt.ageShort(child.birthDate)} 권장 수면: $recommended", style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            item {
                SectionCard(title = "인사이트", emoji = "💡") {
                    val tips = mutableListOf<String>()
                    if (avgInterval in 1 until 90 * 60_000L) tips += "수유 간격이 1시간 30분보다 짧아요. 간식처럼 조금씩 먹는 패턴일 수 있어요."
                    if (avgNap in 1 until 30 * 60_000L) tips += "낮잠이 짧은 편이에요. 어둡고 조용한 환경과 백색소음을 활용해보세요."
                    if (avgBed != null && avgBed in 60..(4 * 60)) tips += "잠드는 시각이 늦은 편이에요. 저녁 루틴을 30분씩 앞당겨보세요."
                    if (feedings.isEmpty() && sleeps.isEmpty()) tips += "아직 분석할 기록이 부족해요. 수유와 수면을 며칠간 기록해주세요."
                    if (tips.isEmpty()) tips += "패턴이 안정적이에요. 지금처럼 일정한 루틴을 유지해주세요 👍"
                    BulletList(tips)
                }
            }
        }
    }
}

// ═══════════════════════ 6·7. 체크리스트 (집 안전 / 외출 가방) ═══════════════════════

class ChecklistViewModel(app: Application) : BaseViewModel(app) {
    val showDiaper: StateFlow<Boolean> = prefs.showDiaper
    fun items(key: String) = db.checklistDao().observe(key)
    fun save(i: ChecklistItem) = io { db.checklistDao().upsert(i) }
    fun delete(i: ChecklistItem) = io { db.checklistDao().delete(i) }
    fun reset(key: String) = io { db.checklistDao().resetChecks(key) }
    fun loadTemplate(key: String) = io {
        if (db.checklistDao().count(key) == 0) db.checklistDao().insertAll(ChecklistTemplates.items(key))
    }
}

@Composable
fun ChecklistScreen(nav: NavController, listKey: String, title: String, intro: String, vm: ChecklistViewModel = viewModel()) {
    val raw by remember(listKey) { vm.items(listKey) }.collectAsState(initial = emptyList())
    val showDiaper by vm.showDiaper.collectAsState()
    val items = raw.filter { showDiaper || !ChecklistTemplates.isDiaperRelated(it.name) }
    var dialog by remember { mutableStateOf<ChecklistItem?>(null) }

    LaunchedEffect(listKey) { vm.loadTemplate(listKey) }

    MomScaffold(title, nav, fabLabel = "항목 추가", onFab = { dialog = ChecklistItem(listKey = listKey, category = "기타", name = "") },
        actions = { TextButton(onClick = { vm.reset(listKey) }) { Text("체크 초기화") } }) { padding ->
        val done = items.count { it.checked }
        ListScreen(padding) {
            item {
                SectionCard(title = "$done / ${items.size} 완료", emoji = if (done == items.size && items.isNotEmpty()) "🎉" else "📋") {
                    Text(intro, style = MaterialTheme.typography.bodyMedium)
                    ProgressBar(if (items.isEmpty()) 0f else done.toFloat() / items.size)
                }
            }
            items.groupBy { it.category }.forEach { (cat, list) ->
                item { SectionHeader("$cat  ${list.count { it.checked }}/${list.size}") }
                items(list, key = { it.id }) { i ->
                    ItemCard(
                        if (i.checked) "✅" else "⬜", i.name, i.note.takeIf { it.isNotBlank() },
                        onClick = { vm.save(i.copy(checked = !i.checked)) },
                        onLongClick = { dialog = i },
                        trailing = { DeleteButton { vm.delete(i) } }
                    )
                }
            }
        }
    }

    dialog?.let { i ->
        var name by remember(i) { mutableStateOf(i.name) }
        var cat by remember(i) { mutableStateOf(i.category) }
        var note by remember(i) { mutableStateOf(i.note) }
        FormDialog("항목", { dialog = null }, confirmEnabled = name.isNotBlank(), onConfirm = {
            vm.save(i.copy(name = name.trim(), category = cat.ifBlank { "기타" }, note = note.trim())); dialog = null
        }) {
            AppTextField(name, { name = it }, "항목")
            AppTextField(cat, { cat = it }, "분류")
            ChipSelector(raw.map { it.category }.distinct(), cat, { it }, { cat = it })
            AppTextField(note, { note = it }, "메모")
        }
    }
}

@Composable
fun SafetyScreen(nav: NavController) = ChecklistScreen(
    nav, ChecklistTemplates.SAFETY, "집 안전 점검",
    "아이가 기고 걷기 시작하면 위험이 늘어나요. 공간별로 점검하고, 계절마다 다시 확인해보세요."
)

@Composable
fun OutingScreen(nav: NavController) = ChecklistScreen(
    nav, ChecklistTemplates.OUTING, "외출 가방 체크",
    "나가기 전에 하나씩 체크하세요. 다녀온 뒤 '체크 초기화'를 누르면 다음 외출에 다시 쓸 수 있어요."
)

// ═══════════════════════ 8. 아이 습관 루틴 ═══════════════════════

class HabitViewModel(app: Application) : BaseViewModel(app) {
    val habits: StateFlow<List<Habit>> = forChild(emptyList()) { db.habitDao().observeHabits(it) }
    val logs: StateFlow<List<HabitLog>> = forChild(emptyList()) { db.habitDao().observeLogs(it, Dt.dayEpoch() - 35) }
    fun save(h: Habit) = io { db.habitDao().upsertHabit(h) }
    fun delete(h: Habit) = io { db.habitDao().deleteHabit(h) }

    fun toggle(h: Habit, day: Long, done: Boolean) = io {
        if (done) {
            db.habitDao().deleteLog(h.id, day)
        } else {
            db.habitDao().insertLog(HabitLog(habitId = h.id, dayEpoch = day))
            if (h.giveSticker) {
                db.rewardDao().insertSticker(StickerLog(childId = h.childId, date = Dt.fromDayEpoch(day), reason = "습관: ${h.title}", emoji = h.emoji))
            }
        }
    }
}

@Composable
fun HabitScreen(nav: NavController, vm: HabitViewModel = viewModel()) {
    val habits by vm.habits.collectAsState()
    val logs by vm.logs.collectAsState()
    var dialog by remember { mutableStateOf<Habit?>(null) }
    val askDelete = rememberDeleteTarget<Habit>({ vm.delete(it) })

    ChildScaffold("아이 습관 루틴", nav, fabLabel = "습관 추가", onFab = { c -> dialog = Habit(childId = c.id, title = "") }) { child, padding ->
        val today = Dt.dayEpoch()
        val monday = today - (Dt.today().dayOfWeek.value - 1)
        val week = (0..6).map { monday + it }
        val logSet = logs.map { it.habitId to it.dayEpoch }.toSet()

        ListScreen(padding) {
            item { InfoBanner("습관을 지키면 칭찬 스티커가 자동으로 쌓여요. 아이와 함께 체크해보세요!", "✨") }
            if (habits.isEmpty()) {
                item { EmptyState("✨", "${child.name}의 습관을 만들어보세요") }
                item {
                    androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        HabitContent.presets.forEach { (e, t) ->
                            androidx.compose.material3.AssistChip(onClick = { vm.save(Habit(childId = child.id, title = t, emoji = e)) }, label = { Text("$e $t") })
                        }
                    }
                }
            }
            items(habits, key = { it.id }) { h ->
                val weekCount = week.count { (h.id to it) in logSet }
                var streak = 0
                var d = if ((h.id to today) in logSet) today else today - 1
                while ((h.id to d) in logSet) { streak++; d-- }
                SectionCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(h.emoji, fontSize = 28.sp)
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f).clickable { dialog = h }) {
                            Text(h.title, style = MaterialTheme.typography.titleMedium)
                            Text("이번 주 $weekCount/${h.weeklyGoal} · 🔥 ${streak}일 연속", style = MaterialTheme.typography.bodySmall)
                        }
                        DeleteButton { askDelete(h) }
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        week.forEach { day ->
                            val done = (h.id to day) in logSet
                            val future = day > today
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(Dt.dayName(Dt.toDate(Dt.fromDayEpoch(day)).dayOfWeek.value), style = MaterialTheme.typography.bodySmall)
                                Box(
                                    Modifier.size(36.dp).clip(CircleShape)
                                        .background(
                                            when {
                                                done -> MaterialTheme.colorScheme.primary
                                                day == today -> MaterialTheme.colorScheme.primaryContainer
                                                else -> MaterialTheme.colorScheme.surfaceVariant
                                            }
                                        )
                                        .clickable(enabled = !future) { vm.toggle(h, day, done) },
                                    contentAlignment = Alignment.Center
                                ) { Text(if (done) "✓" else "", color = Color.White) }
                            }
                        }
                    }
                    ProgressBar((weekCount.toFloat() / h.weeklyGoal).coerceAtMost(1f))
                }
            }
        }

        dialog?.let { h ->
            var title by remember(h) { mutableStateOf(h.title) }
            var emoji by remember(h) { mutableStateOf(h.emoji) }
            var goal by remember(h) { mutableStateOf(h.weeklyGoal) }
            var sticker by remember(h) { mutableStateOf(h.giveSticker) }
            FormDialog("습관", { dialog = null }, confirmEnabled = title.isNotBlank(), onConfirm = {
                vm.save(h.copy(title = title.trim(), emoji = emoji, weeklyGoal = goal, giveSticker = sticker)); dialog = null
            }) {
                AppTextField(title, { title = it }, "습관 이름")
                ChipSelector(HabitContent.presets.map { it.first }.distinct(), emoji, { it }, { emoji = it })
                Text("주간 목표", style = MaterialTheme.typography.bodySmall)
                ChipSelector((1..7).toList(), goal, { "${it}회" }, { goal = it })
                com.momcare.app.ui.components.SwitchRow("지키면 칭찬 스티커 주기", sticker, { sticker = it })
            }
        }
    }
}

// ═══════════════════════ 9. 독서 기록 ═══════════════════════

class BookViewModel(app: Application) : BaseViewModel(app) {
    val books: StateFlow<List<BookLog>> = db.bookDao().observeAll().asState(emptyList())
    fun save(b: BookLog) = io { db.bookDao().upsert(b) }
    fun delete(b: BookLog) = io { db.bookDao().delete(b) }
}

@Composable
fun BookScreen(nav: NavController, vm: BookViewModel = viewModel()) {
    val all by vm.books.collectAsState()
    val child = LocalChild.current
    var dialog by remember { mutableStateOf<BookLog?>(null) }
    val askDelete = rememberDeleteTarget<BookLog>({ vm.delete(it) })
    val books = all.filter { child == null || it.childId == null || it.childId == child.id }

    MomScaffold("그림책 독서 기록", nav, fabLabel = "읽은 책 기록", onFab = {
        dialog = BookLog(childId = child?.id, title = "", date = Dt.now())
    }) { padding ->
        val monthStart = Dt.monthStart(Dt.today())
        val thisMonth = books.filter { it.date >= monthStart }
        val favorites = books.groupBy { it.title }.mapValues { it.value.size }.entries.sortedByDescending { it.value }.take(3)
        val daily = (6 downTo 0).map { d ->
            val s = Dt.todayStart() - d * Dt.DAY_MS
            BarItem(Dt.short(s), books.filter { it.date in s until s + Dt.DAY_MS }.sumOf { it.minutes }.toFloat())
        }
        ListScreen(padding) {
            item {
                SectionCard(title = "이번 달 ${thisMonth.size}권 · ${thisMonth.sumOf { it.minutes }}분", emoji = "📚") {
                    BarChart(daily, valueLabel = { "${it.toInt()}분" })
                    if (favorites.isNotEmpty()) {
                        Text("가장 많이 읽은 책: " + favorites.joinToString { "${it.key}(${it.value})" }, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            child?.let { c ->
                item {
                    val rec = BookContent.forMonth(Dt.monthsBetween(c.birthDate))
                    InfoBanner("${Dt.ageShort(c.birthDate)} 추천: ${rec.type} — ${rec.tip}", "📖")
                }
            }
            if (books.isEmpty()) item { EmptyState("📚", "읽어준 책을 기록해보세요") }
            items(books, key = { it.id }) { b ->
                ItemCard(
                    "📖", b.title, "${Dt.dateWeek(b.date)} · ${b.minutes}분 · " + "⭐".repeat(b.rating),
                    detail = listOf(b.author, b.memo).filter { it.isNotBlank() }.joinToString(" · "),
                    onClick = { dialog = b }, trailing = { DeleteButton { askDelete(b) } }
                )
            }
        }
    }

    dialog?.let { b ->
        var title by remember(b) { mutableStateOf(b.title) }
        var author by remember(b) { mutableStateOf(b.author) }
        var date by remember(b) { mutableStateOf(b.date) }
        var minutes by remember(b) { mutableStateOf(b.minutes.toString()) }
        var rating by remember(b) { mutableStateOf(b.rating) }
        var memo by remember(b) { mutableStateOf(b.memo) }
        val recentTitles = all.map { it.title }.distinct().take(8)
        FormDialog("읽은 책", { dialog = null }, confirmEnabled = title.isNotBlank(), onConfirm = {
            vm.save(b.copy(title = title.trim(), author = author.trim(), date = date, minutes = minutes.toDoubleOrNull()?.toInt() ?: 10, rating = rating, memo = memo.trim()))
            dialog = null
        }) {
            AppTextField(title, { title = it }, "책 제목")
            if (recentTitles.isNotEmpty()) ChipSelector(recentTitles, null, { it }, { title = it })
            AppTextField(author, { author = it }, "작가 (선택)")
            DateField("날짜", date, { date = it })
            NumberField(minutes, { minutes = it }, "읽은 시간", "분")
            RatingRow("아이 반응", rating, { rating = it })
            AppTextField(memo, { memo = it }, "아이가 한 말, 좋아한 장면", singleLine = false, minLines = 2)
        }
    }
}

// ═══════════════════════ 10. 레시피북 ═══════════════════════

class RecipeViewModel(app: Application) : BaseViewModel(app) {
    val recipes: StateFlow<List<Recipe>> = db.recipeDao().observeAll().asState(emptyList())
    init {
        io { if (db.recipeDao().builtInCount() == 0) db.recipeDao().insertAll(RecipeContent.builtIn) }
    }
    fun save(r: Recipe) = io { db.recipeDao().upsert(r) }
    fun delete(r: Recipe) = io { db.recipeDao().delete(r) }
    fun addIngredientsToShopping(r: Recipe) = io {
        r.ingredients.split(",").map { it.trim() }.filter { it.isNotBlank() }.forEach {
            db.shoppingDao().upsert(com.momcare.app.data.ShoppingItem(name = it, category = com.momcare.app.data.ShoppingCategory.FOOD))
        }
    }
}

@Composable
fun RecipeScreen(nav: NavController, vm: RecipeViewModel = viewModel()) {
    val recipes by vm.recipes.collectAsState()
    val child = LocalChild.current
    var category by remember { mutableStateOf("") }
    var query by remember { mutableStateOf("") }
    var onlyAge by remember { mutableStateOf(false) }
    var detail by remember { mutableStateOf<Recipe?>(null) }
    var dialog by remember { mutableStateOf<Recipe?>(null) }
    val months = child?.let { Dt.monthsBetween(it.birthDate) }

    MomScaffold("아이 레시피북", nav, fabLabel = "레시피 추가", onFab = { dialog = Recipe(title = "") }) { padding ->
        val shown = recipes.filter {
            (category.isEmpty() || it.category == category) &&
                (query.isBlank() || it.title.contains(query) || it.ingredients.contains(query)) &&
                (!onlyAge || months == null || it.fromMonth <= months)
        }
        ListScreen(padding) {
            item { AppTextField(query, { query = it }, "레시피·재료 검색") }
            item { ChipSelector(listOf("") + RecipeContent.categories, category, { it.ifEmpty { "전체" } }, { category = it }) }
            if (months != null) item { com.momcare.app.ui.components.SwitchRow("${child.name}(${months}개월)이 먹을 수 있는 것만", onlyAge, { onlyAge = it }) }
            if (shown.isEmpty()) item { EmptyState("🍳", "조건에 맞는 레시피가 없어요") }
            items(shown, key = { it.id }) { r ->
                ItemCard(
                    if (r.favorite) "⭐" else "🍳", r.title, "${r.category} · ${r.fromMonth}개월~",
                    detail = r.ingredients, onClick = { detail = r },
                    trailing = { if (!r.builtIn) DeleteButton { vm.delete(r) } }
                )
            }
        }
    }

    detail?.let { r ->
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { detail = null },
            title = { Text(r.title) },
            text = {
                Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { Pill(r.category); Pill("${r.fromMonth}개월~") }
                    Text("재료", style = MaterialTheme.typography.titleMedium)
                    Text(r.ingredients)
                    Text("만드는 법", style = MaterialTheme.typography.titleMedium)
                    Text(r.steps)
                    if (r.tip.isNotBlank()) InfoBanner(r.tip)
                }
            },
            confirmButton = {
                Row {
                    TextButton(onClick = { vm.save(r.copy(favorite = !r.favorite)); detail = null }) { Text(if (r.favorite) "즐겨찾기 해제" else "⭐ 즐겨찾기") }
                    TextButton(onClick = { vm.addIngredientsToShopping(r); detail = null }) { Text("🛒 재료 담기") }
                }
            },
            dismissButton = {
                Row {
                    if (!r.builtIn) TextButton(onClick = { dialog = r; detail = null }) { Text("수정") }
                    TextButton(onClick = { detail = null }) { Text("닫기") }
                }
            }
        )
    }

    dialog?.let { r ->
        var title by remember(r) { mutableStateOf(r.title) }
        var cat by remember(r) { mutableStateOf(r.category) }
        var from by remember(r) { mutableStateOf(r.fromMonth.toString()) }
        var ing by remember(r) { mutableStateOf(r.ingredients) }
        var steps by remember(r) { mutableStateOf(r.steps) }
        var tip by remember(r) { mutableStateOf(r.tip) }
        FormDialog("레시피", { dialog = null }, confirmEnabled = title.isNotBlank(), onConfirm = {
            vm.save(r.copy(title = title.trim(), category = cat, fromMonth = from.toDoubleOrNull()?.toInt() ?: 6,
                ingredients = ing.trim(), steps = steps.trim(), tip = tip.trim()))
            dialog = null
        }) {
            AppTextField(title, { title = it }, "요리 이름")
            ChipSelector(RecipeContent.categories, cat, { it }, { cat = it })
            NumberField(from, { from = it }, "시작 월령", "개월")
            AppTextField(ing, { ing = it }, "재료 (쉼표로 구분)", singleLine = false, minLines = 2)
            AppTextField(steps, { steps = it }, "만드는 법", singleLine = false, minLines = 4)
            AppTextField(tip, { tip = it }, "팁")
        }
    }
}
