@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.momcare.app.ui.screens

import android.app.Application
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.momcare.app.content.GearTemplates
import com.momcare.app.content.MealContent
import com.momcare.app.data.Anniversary
import com.momcare.app.data.Appointment
import com.momcare.app.data.DiaryEntry
import com.momcare.app.data.Expense
import com.momcare.app.data.ExpenseCategory
import com.momcare.app.data.FamilyColor
import com.momcare.app.data.FamilyEvent
import com.momcare.app.data.GearItem
import com.momcare.app.data.MealPlan
import com.momcare.app.data.MealType
import com.momcare.app.data.Priority
import com.momcare.app.data.ShoppingCategory
import com.momcare.app.data.ShoppingItem
import com.momcare.app.data.TodoItem
import com.momcare.app.notif.Reminders
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.AppTextField
import com.momcare.app.ui.components.BarChart
import com.momcare.app.ui.components.BarItem
import com.momcare.app.ui.components.ChipSelector
import com.momcare.app.ui.components.DateField
import com.momcare.app.ui.components.DateTimeFields
import com.momcare.app.ui.components.DeleteButton
import com.momcare.app.ui.components.DonutChart
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
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.SectionHeader
import com.momcare.app.ui.components.StatPill
import com.momcare.app.ui.components.SwitchRow
import com.momcare.app.ui.components.rememberDeleteTarget
import com.momcare.app.ui.theme.Lavender
import com.momcare.app.ui.theme.Mint
import com.momcare.app.ui.theme.Orange
import com.momcare.app.ui.theme.Rose
import com.momcare.app.ui.theme.Sky
import com.momcare.app.ui.theme.Sun
import com.momcare.app.util.Dt
import java.io.File
import java.time.LocalDate
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.ExperimentalCoroutinesApi

// ═══════════════════════ 육아 일기 ═══════════════════════

class DiaryViewModel(app: Application) : BaseViewModel(app) {
    val entries: StateFlow<List<DiaryEntry>> = db.diaryDao().observeAll().asState(emptyList())

    fun save(e: DiaryEntry) = io { db.diaryDao().upsert(e) }
    fun delete(e: DiaryEntry) = io {
        e.photoPath?.let { runCatching { File(it).delete() } }
        db.diaryDao().delete(e)
    }

    /** 선택한 사진을 앱 내부 저장소로 복사 (원본 권한 만료 방지) */
    suspend fun copyPhoto(uri: Uri): String? = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        runCatching {
            val dir = File(context.filesDir, "diary").apply { mkdirs() }
            val out = File(dir, "photo_${System.currentTimeMillis()}.jpg")
            context.contentResolver.openInputStream(uri)?.use { input -> out.outputStream().use { input.copyTo(it) } }
            out.absolutePath
        }.getOrNull()
    }
}

@Composable
fun DiaryScreen(nav: NavController, vm: DiaryViewModel = viewModel()) {
    val entries by vm.entries.collectAsState()
    val child = LocalChild.current
    val children = LocalChildren.current
    var dialog by remember { mutableStateOf<DiaryEntry?>(null) }
    val askDelete = rememberDeleteTarget<DiaryEntry>({ vm.delete(it) })

    MomScaffold("육아 일기", nav, fabLabel = "일기 쓰기", onFab = {
        dialog = DiaryEntry(childId = child?.id, date = Dt.now(), title = "", content = "")
    }) { padding ->
        ListScreen(padding) {
            if (entries.isEmpty()) item { EmptyState("📔", "첫 일기를 남겨보세요", "오늘 있었던 소중한 순간을 사진과 함께 기록해요.") }
            items(entries, key = { it.id }) { e ->
                val who = children.firstOrNull { it.id == e.childId }
                SectionCard(modifier = Modifier.clickable { dialog = e }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(e.moodEmoji, fontSize = 26.sp)
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Text(e.title.ifBlank { "제목 없음" }, style = MaterialTheme.typography.titleMedium)
                            Text(
                                Dt.dateLong(e.date) + (who?.let { " · ${it.name} ${Dt.ageText(it.birthDate, e.date)}" } ?: ""),
                                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        DeleteButton { askDelete(e) }
                    }
                    e.photoPath?.let { path ->
                        AsyncImage(
                            model = File(path), contentDescription = null, contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxWidth().height(180.dp).clip(MaterialTheme.shapes.medium)
                        )
                    }
                    if (e.content.isNotBlank()) Text(e.content, style = MaterialTheme.typography.bodyMedium, maxLines = 5)
                }
            }
        }
    }

    dialog?.let { e ->
        var title by remember(e) { mutableStateOf(e.title) }
        var content by remember(e) { mutableStateOf(e.content) }
        var date by remember(e) { mutableStateOf(e.date) }
        var mood by remember(e) { mutableStateOf(e.moodEmoji) }
        var photo by remember(e) { mutableStateOf(e.photoPath) }
        var childId by remember(e) { mutableStateOf(e.childId) }
        val scope = androidx.compose.runtime.rememberCoroutineScope()
        val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
            if (uri != null) scope.launch { vm.copyPhoto(uri)?.let { photo = it } }
        }
        FormDialog("육아 일기", { dialog = null }, confirmEnabled = title.isNotBlank() || content.isNotBlank(), onConfirm = {
            vm.save(e.copy(title = title.trim(), content = content.trim(), date = date, moodEmoji = mood, photoPath = photo, childId = childId))
            dialog = null
        }) {
            DateField("날짜", date, { date = it })
            AppTextField(title, { title = it }, "제목")
            AppTextField(content, { content = it }, "오늘의 이야기", singleLine = false, minLines = 5)
            Text("오늘의 기분", style = MaterialTheme.typography.bodySmall)
            ChipSelector(listOf("😊", "😍", "🥰", "😴", "😢", "😠", "🤒", "🎉"), mood, { it }, { mood = it })
            if (children.isNotEmpty()) {
                ChipSelector(listOf<Long?>(null) + children.map { it.id }, childId, { id -> children.firstOrNull { it.id == id }?.name ?: "가족" }, { childId = it })
            }
            photo?.let {
                AsyncImage(model = File(it), contentDescription = null, contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().height(140.dp).clip(MaterialTheme.shapes.medium))
            }
            OutlinedButton(onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, Modifier.fillMaxWidth()) {
                Text(if (photo == null) "📷 사진 추가" else "📷 사진 바꾸기")
            }
        }
    }
}

// ═══════════════════════ 기념일 ═══════════════════════

class AnniversaryViewModel(app: Application) : BaseViewModel(app) {
    val items: StateFlow<List<Anniversary>> = db.anniversaryDao().observeAll().asState(emptyList())
    fun save(a: Anniversary) = io { db.anniversaryDao().upsert(a) }
    fun delete(a: Anniversary) = io { db.anniversaryDao().delete(a) }
}

@Composable
fun AnniversaryScreen(nav: NavController, vm: AnniversaryViewModel = viewModel()) {
    val items by vm.items.collectAsState()
    val child = LocalChild.current
    var dialog by remember { mutableStateOf<Anniversary?>(null) }
    val askDelete = rememberDeleteTarget<Anniversary>({ vm.delete(it) })

    MomScaffold("기념일 D-day", nav, fabLabel = "기념일 추가", onFab = {
        dialog = Anniversary(childId = child?.id, title = "", date = Dt.todayStart())
    }) { padding ->
        val rows = items.map { a ->
            val target = if (a.repeatYearly) Dt.nextYearly(a.date) else a.date
            Triple(a, target, Dt.dDay(target))
        }.sortedBy { if (it.third < 0) Int.MAX_VALUE + it.third else it.third }

        ListScreen(padding) {
            // 아이 자동 기념일 (백일, 돌, 생일)
            child?.let { c ->
                val milestones = listOf(
                    "백일" to Dt.startOfDay(Dt.toDate(c.birthDate).plusDays(99)),
                    "첫 돌" to Dt.startOfDay(Dt.toDate(c.birthDate).plusYears(1)),
                    "200일" to Dt.startOfDay(Dt.toDate(c.birthDate).plusDays(199)),
                    "다음 생일" to Dt.nextYearly(c.birthDate)
                ).filter { Dt.dDay(it.second) >= 0 }.sortedBy { it.second }.take(3)
                if (milestones.isNotEmpty()) {
                    item {
                        SectionCard(title = "${c.name}의 다가오는 날", emoji = "🎂") {
                            milestones.forEach { (n, d) ->
                                Row(Modifier.fillMaxWidth()) {
                                    Text("$n · ${Dt.date(d)}", Modifier.weight(1f))
                                    Pill(Dt.dDayText(Dt.dDay(d)))
                                }
                            }
                        }
                    }
                }
            }
            if (rows.isEmpty()) item { EmptyState("🎉", "등록된 기념일이 없어요") }
            items(rows, key = { it.first.id }) { (a, target, d) ->
                ItemCard(
                    emoji = a.emoji, title = a.title,
                    subtitle = Dt.dateLong(target) + if (a.repeatYearly) " · 매년" else "",
                    trailing = { Row(verticalAlignment = Alignment.CenterVertically) { Pill(Dt.dDayText(d)); DeleteButton { askDelete(a) } } },
                    onClick = { dialog = a }
                )
            }
        }
    }

    dialog?.let { a ->
        var title by remember(a) { mutableStateOf(a.title) }
        var date by remember(a) { mutableStateOf(a.date) }
        var yearly by remember(a) { mutableStateOf(a.repeatYearly) }
        var emoji by remember(a) { mutableStateOf(a.emoji) }
        FormDialog("기념일", { dialog = null }, confirmEnabled = title.isNotBlank(), onConfirm = {
            vm.save(a.copy(title = title.trim(), date = date, repeatYearly = yearly, emoji = emoji)); dialog = null
        }) {
            AppTextField(title, { title = it }, "이름 (예: 결혼기념일)")
            DateField("날짜", date, { date = it })
            SwitchRow("매년 반복", yearly, { yearly = it })
            ChipSelector(listOf("🎉", "🎂", "💍", "👶", "🏫", "✈️", "💐"), emoji, { it }, { emoji = it })
        }
    }
}

// ═══════════════════════ 할 일 ═══════════════════════

class TodoViewModel(app: Application) : BaseViewModel(app) {
    val items: StateFlow<List<TodoItem>> = db.todoDao().observeAll().asState(emptyList())
    fun save(t: TodoItem) = io { db.todoDao().upsert(t) }
    fun delete(t: TodoItem) = io { db.todoDao().delete(t) }
    fun clearDone() = io { db.todoDao().clearDone() }
}

@Composable
fun TodoScreen(nav: NavController, vm: TodoViewModel = viewModel()) {
    val raw by vm.items.collectAsState()
    var dialog by remember { mutableStateOf<TodoItem?>(null) }
    var quick by remember { mutableStateOf("") }
    // enum 이름 정렬이 아닌 우선순위 순서로 정렬
    val items = raw.sortedWith(compareBy<TodoItem>({ it.done }, { -it.priority.ordinal }, { it.dueDate ?: Long.MAX_VALUE }))

    MomScaffold("할 일", nav, fabLabel = "상세 추가", onFab = { dialog = TodoItem(title = "") },
        actions = { TextButton(onClick = { vm.clearDone() }) { Text("완료 삭제") } }) { padding ->
        ListScreen(padding) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AppTextField(quick, { quick = it }, "빠른 추가", modifier = Modifier.weight(1f))
                    TextButton(onClick = {
                        if (quick.isNotBlank()) { vm.save(TodoItem(title = quick.trim())); quick = "" }
                    }) { Text("추가") }
                }
            }
            item {
                val open = items.count { !it.done }
                Text("남은 일 ${open}개 · 완료 ${items.size - open}개", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (items.isEmpty()) item { EmptyState("✅", "할 일이 없어요", "병원 예약, 서류 제출 등 가족의 할 일을 적어보세요.") }
            items(items, key = { it.id }) { t ->
                val overdue = !t.done && t.dueDate != null && t.dueDate < Dt.todayStart()
                ItemCard(
                    emoji = t.priority.emoji, title = t.title,
                    subtitle = listOfNotNull(
                        t.dueDate?.let { (if (overdue) "⏰ 기한 지남 " else "") + Dt.dateWeek(it) },
                        t.assignee.takeIf { it.isNotBlank() }?.let { "담당 $it" }
                    ).joinToString(" · ").ifBlank { null },
                    onClick = { dialog = t },
                    trailing = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(t.done, { vm.save(t.copy(done = it)) })
                            DeleteButton { vm.delete(t) }
                        }
                    }
                )
            }
        }
    }

    dialog?.let { t ->
        var title by remember(t) { mutableStateOf(t.title) }
        var hasDue by remember(t) { mutableStateOf(t.dueDate != null) }
        var due by remember(t) { mutableStateOf(t.dueDate ?: Dt.todayStart()) }
        var pr by remember(t) { mutableStateOf(t.priority) }
        var who by remember(t) { mutableStateOf(t.assignee) }
        FormDialog("할 일", { dialog = null }, confirmEnabled = title.isNotBlank(), onConfirm = {
            vm.save(t.copy(title = title.trim(), dueDate = if (hasDue) due else null, priority = pr, assignee = who.trim())); dialog = null
        }) {
            AppTextField(title, { title = it }, "할 일")
            SwitchRow("기한 설정", hasDue, { hasDue = it })
            if (hasDue) DateField("기한", due, { due = it })
            ChipSelector(Priority.entries, pr, { "${it.emoji} ${it.label}" }, { pr = it })
            ChipSelector(listOf("", "엄마", "아빠", "할머니", "할아버지"), who, { it.ifBlank { "담당 없음" } }, { who = it })
        }
    }
}

// ═══════════════════════ 장보기 ═══════════════════════

class ShoppingViewModel(app: Application) : BaseViewModel(app) {
    val items: StateFlow<List<ShoppingItem>> = db.shoppingDao().observeAll().asState(emptyList())
    fun save(s: ShoppingItem) = io { db.shoppingDao().upsert(s) }
    fun delete(s: ShoppingItem) = io { db.shoppingDao().delete(s) }
    fun clearChecked() = io { db.shoppingDao().clearChecked() }
}

@Composable
fun ShoppingScreen(nav: NavController, vm: ShoppingViewModel = viewModel()) {
    val items by vm.items.collectAsState()
    var dialog by remember { mutableStateOf<ShoppingItem?>(null) }
    var quick by remember { mutableStateOf("") }

    MomScaffold("장보기 목록", nav, fabLabel = "상세 추가", onFab = { dialog = ShoppingItem(name = "") },
        actions = { TextButton(onClick = { vm.clearChecked() }) { Text("구매 완료 비우기") } }) { padding ->
        val total = items.filter { !it.checked }.sumOf { it.price ?: 0 }
        ListScreen(padding) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AppTextField(quick, { quick = it }, "사야 할 것", modifier = Modifier.weight(1f))
                    TextButton(onClick = { if (quick.isNotBlank()) { vm.save(ShoppingItem(name = quick.trim())); quick = "" } }) { Text("추가") }
                }
            }
            item {
                androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    MealContent.shoppingStarter.filter { s -> items.none { it.name == s } }.take(8).forEach { s ->
                        androidx.compose.material3.AssistChip(onClick = { vm.save(ShoppingItem(name = s)) }, label = { Text("+ $s") })
                    }
                }
            }
            if (total > 0) item { Text("예상 금액 ${"%,d".format(total)}원", style = MaterialTheme.typography.titleMedium) }
            if (items.isEmpty()) item { EmptyState("🛒", "장볼 목록이 비어있어요") }
            ShoppingCategory.entries.forEach { cat ->
                val list = items.filter { it.category == cat }
                if (list.isNotEmpty()) {
                    item { SectionHeader("${cat.emoji} ${cat.label}") }
                    items(list, key = { it.id }) { s ->
                        ItemCard(
                            emoji = if (s.checked) "✅" else cat.emoji,
                            title = s.name + if (s.quantity != "1") " × ${s.quantity}" else "",
                            subtitle = s.price?.let { "${"%,d".format(it)}원" },
                            onClick = { dialog = s },
                            trailing = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(s.checked, { vm.save(s.copy(checked = it)) })
                                    DeleteButton { vm.delete(s) }
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    dialog?.let { s ->
        var name by remember(s) { mutableStateOf(s.name) }
        var qty by remember(s) { mutableStateOf(s.quantity) }
        var cat by remember(s) { mutableStateOf(s.category) }
        var price by remember(s) { mutableStateOf(s.price?.toString() ?: "") }
        FormDialog("장보기 항목", { dialog = null }, confirmEnabled = name.isNotBlank(), onConfirm = {
            vm.save(s.copy(name = name.trim(), quantity = qty.ifBlank { "1" }, category = cat, price = price.toDoubleOrNull()?.toInt())); dialog = null
        }) {
            AppTextField(name, { name = it }, "품목")
            AppTextField(qty, { qty = it }, "수량")
            NumberField(price, { price = it }, "예상 가격", "원")
            ChipSelector(ShoppingCategory.entries, cat, { "${it.emoji} ${it.label}" }, { cat = it })
        }
    }
}

// ═══════════════════════ 주간 식단 ═══════════════════════

class MealPlanViewModel(app: Application) : BaseViewModel(app) {
    val plans: StateFlow<List<MealPlan>> = db.mealPlanDao().observeAll().asState(emptyList())
    fun set(day: Int, type: MealType, menu: String) = io {
        if (menu.isBlank()) db.mealPlanDao().deleteSlot(day, type)
        else {
            val existing = plans.value.firstOrNull { it.dayOfWeek == day && it.mealType == type }
            db.mealPlanDao().upsert(MealPlan(id = existing?.id ?: 0, dayOfWeek = day, mealType = type, menu = menu))
        }
    }
    fun clearAll() = io { db.mealPlanDao().clearAll() }
    fun addToShopping(menus: List<String>) = io {
        menus.forEach { db.shoppingDao().upsert(ShoppingItem(name = it, category = ShoppingCategory.FOOD)) }
    }
}

@Composable
fun MealPlanScreen(nav: NavController, vm: MealPlanViewModel = viewModel()) {
    val plans by vm.plans.collectAsState()
    var edit by remember { mutableStateOf<Pair<Int, MealType>?>(null) }
    val today = Dt.today().dayOfWeek.value

    MomScaffold("주간 식단", nav, actions = { TextButton(onClick = { vm.clearAll() }) { Text("전체 비우기") } }) { padding ->
        ListScreen(padding) {
            item { InfoBanner("칸을 눌러 메뉴를 입력하세요. 추천 메뉴를 눌러 빠르게 채울 수도 있어요.", "🍱") }
            items((1..7).toList()) { day ->
                SectionCard(title = Dt.dayName(day) + "요일" + if (day == today) "  (오늘)" else "", emoji = "📆",
                    container = if (day == today) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else MaterialTheme.colorScheme.surface) {
                    MealType.entries.forEach { type ->
                        val menu = plans.firstOrNull { it.dayOfWeek == day && it.mealType == type }?.menu
                        Row(Modifier.fillMaxWidth().clickable { edit = day to type }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("${type.emoji} ${type.label}", Modifier.width(70.dp), style = MaterialTheme.typography.bodySmall)
                            Text(menu ?: "+ 메뉴 입력", color = if (menu == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
            }
            item {
                OutlinedButton(onClick = { vm.addToShopping(plans.map { it.menu }.distinct()) }, Modifier.fillMaxWidth(), enabled = plans.isNotEmpty()) {
                    Text("🛒 이번 주 메뉴를 장보기 목록에 담기")
                }
            }
        }
    }

    edit?.let { (day, type) ->
        var text by remember(day, type) { mutableStateOf(plans.firstOrNull { it.dayOfWeek == day && it.mealType == type }?.menu ?: "") }
        FormDialog("${Dt.dayName(day)}요일 ${type.label}", { edit = null }, onConfirm = { vm.set(day, type, text.trim()); edit = null }) {
            AppTextField(text, { text = it }, "메뉴")
            Text("추천 메뉴", style = MaterialTheme.typography.bodySmall)
            androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                MealContent.ideas.forEach { m ->
                    androidx.compose.material3.AssistChip(onClick = { text = m }, label = { Text(m) })
                }
            }
        }
    }
}

// ═══════════════════════ 육아 가계부 ═══════════════════════

class ExpenseViewModel(app: Application) : BaseViewModel(app) {
    val month = MutableStateFlow(Dt.today().withDayOfMonth(1))

    @OptIn(ExperimentalCoroutinesApi::class)
    val items: StateFlow<List<Expense>> = month.flatMapLatest {
        db.expenseDao().observeRange(Dt.monthStart(it), Dt.nextMonthStart(it))
    }.asState(emptyList())

    fun shift(delta: Long) { month.value = month.value.plusMonths(delta) }
    fun save(e: Expense) = io { db.expenseDao().upsert(e) }
    fun delete(e: Expense) = io { db.expenseDao().delete(e) }
}

@Composable
fun ExpenseScreen(nav: NavController, vm: ExpenseViewModel = viewModel()) {
    val items by vm.items.collectAsState()
    val month by vm.month.collectAsState()
    val child = LocalChild.current
    var dialog by remember { mutableStateOf<Expense?>(null) }
    val askDelete = rememberDeleteTarget<Expense>({ vm.delete(it) })

    MomScaffold("육아 가계부", nav, fabLabel = "지출 추가", onFab = {
        dialog = Expense(childId = child?.id, date = Dt.now(), category = ExpenseCategory.DIAPER, title = "", amount = 0)
    }) { padding ->
        val total = items.sumOf { it.amount }
        val byCat = ExpenseCategory.entries.map { c -> c to items.filter { it.category == c }.sumOf { it.amount } }.filter { it.second > 0 }
        val colors = listOf(Rose, Sky, Mint, Orange, Lavender, Sun, Color(0xFF8D6E63), Color(0xFF26A69A), Color(0xFF90A4AE))

        ListScreen(padding) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { vm.shift(-1) }) { Text("◀") }
                    Text(Dt.month(month), Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.titleMedium)
                    TextButton(onClick = { vm.shift(1) }) { Text("▶") }
                }
            }
            item {
                SectionCard(title = "이번 달 총 지출", emoji = "💰") {
                    Text("${"%,d".format(total)}원", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
                    if (byCat.isNotEmpty()) {
                        DonutChart(byCat.map { it.first.label to it.second.toFloat() }, colors)
                    }
                }
            }
            if (items.isEmpty()) item { EmptyState("💰", "이번 달 지출이 없어요") }
            items(items, key = { it.id }) { e ->
                ItemCard(
                    emoji = e.category.emoji, title = e.title.ifBlank { e.category.label },
                    subtitle = "${Dt.dateWeek(e.date)} · ${e.category.label}",
                    detail = e.memo.takeIf { it.isNotBlank() },
                    trailing = { Row(verticalAlignment = Alignment.CenterVertically) { Text("${"%,d".format(e.amount)}원", style = MaterialTheme.typography.titleMedium); DeleteButton { askDelete(e) } } },
                    onClick = { dialog = e }
                )
            }
        }
    }

    dialog?.let { e ->
        var title by remember(e) { mutableStateOf(e.title) }
        var amount by remember(e) { mutableStateOf(e.amount.takeIf { it > 0 }?.toString() ?: "") }
        var date by remember(e) { mutableStateOf(e.date) }
        var cat by remember(e) { mutableStateOf(e.category) }
        var memo by remember(e) { mutableStateOf(e.memo) }
        FormDialog("지출", { dialog = null }, confirmEnabled = (amount.toDoubleOrNull() ?: 0.0) > 0, onConfirm = {
            vm.save(e.copy(title = title.trim(), amount = amount.toDouble().toInt(), date = date, category = cat, memo = memo.trim())); dialog = null
        }) {
            DateField("날짜", date, { date = it })
            NumberField(amount, { amount = it }, "금액", "원")
            AppTextField(title, { title = it }, "내용")
            ChipSelector(ExpenseCategory.entries, cat, { "${it.emoji} ${it.label}" }, { cat = it })
            AppTextField(memo, { memo = it }, "메모")
        }
    }
}

// ═══════════════════════ 가족 캘린더 ═══════════════════════

class CalendarViewModel(app: Application) : BaseViewModel(app) {
    val month = MutableStateFlow(Dt.today().withDayOfMonth(1))

    @OptIn(ExperimentalCoroutinesApi::class)
    val events: StateFlow<List<FamilyEvent>> = month.flatMapLatest {
        db.familyEventDao().observeRange(Dt.monthStart(it), Dt.nextMonthStart(it))
    }.asState(emptyList())

    @OptIn(ExperimentalCoroutinesApi::class)
    val appointments: StateFlow<List<Appointment>> = month.flatMapLatest {
        db.appointmentDao().observeRange(Dt.monthStart(it), Dt.nextMonthStart(it))
    }.asState(emptyList())

    val anniversaries: StateFlow<List<Anniversary>> = db.anniversaryDao().observeAll().asState(emptyList())

    fun shift(delta: Long) { month.value = month.value.plusMonths(delta) }

    fun save(e: FamilyEvent) = io {
        val id = db.familyEventDao().upsert(e)
        val key = Reminders.eventKey(if (e.id == 0L) id else e.id)
        Reminders.cancel(context, key)
        if (e.remindMinutes > 0) {
            Reminders.scheduleOnce(context, key, "📅 ${e.title}", Dt.dateTime(e.startTime), e.startTime - e.remindMinutes * 60_000L, "calendar")
        }
    }

    fun delete(e: FamilyEvent) = io {
        Reminders.cancel(context, Reminders.eventKey(e.id)); db.familyEventDao().delete(e)
    }
}

@Composable
fun CalendarScreen(nav: NavController, vm: CalendarViewModel = viewModel()) {
    val month by vm.month.collectAsState()
    val events by vm.events.collectAsState()
    val appts by vm.appointments.collectAsState()
    val annis by vm.anniversaries.collectAsState()
    var selected by remember { mutableStateOf(Dt.today()) }
    var dialog by remember { mutableStateOf<FamilyEvent?>(null) }
    val askDelete = rememberDeleteTarget<FamilyEvent>({ vm.delete(it) })

    // 기념일을 현재 월에 맞춰 날짜로 전개
    val anniDays: Map<LocalDate, List<Anniversary>> = annis.mapNotNull { a ->
        val d = Dt.toDate(a.date)
        val inMonth = if (a.repeatYearly) runCatching { d.withYear(month.year) }.getOrNull() else d
        if (inMonth != null && inMonth.year == month.year && inMonth.month == month.month) inMonth to a else null
    }.groupBy({ it.first }, { it.second })

    fun marks(day: LocalDate): List<Color> {
        val c = mutableListOf<Color>()
        events.filter { Dt.toDate(it.startTime) == day }.forEach { c += Color(it.color.argb) }
        if (appts.any { Dt.toDate(it.time) == day }) c += Sky
        if (anniDays[day] != null) c += Sun
        return c.take(3)
    }

    MomScaffold("가족 캘린더", nav, fabLabel = "일정 추가", onFab = {
        dialog = FamilyEvent(title = "", startTime = Dt.atTime(Dt.startOfDay(selected), 10, 0))
    }) { padding ->
        ListScreen(padding) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { vm.shift(-1) }) { Text("◀") }
                    Text(Dt.month(month), Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.titleMedium)
                    TextButton(onClick = { vm.shift(1) }) { Text("▶") }
                }
            }
            item {
                SectionCard {
                    Row(Modifier.fillMaxWidth()) {
                        listOf("월", "화", "수", "목", "금", "토", "일").forEach {
                            Text(it, Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.bodySmall,
                                color = if (it == "일") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    val first = month.withDayOfMonth(1)
                    val offset = first.dayOfWeek.value - 1
                    val days = month.lengthOfMonth()
                    val cells = offset + days
                    val rows = (cells + 6) / 7
                    for (r in 0 until rows) {
                        Row(Modifier.fillMaxWidth()) {
                            for (c in 0 until 7) {
                                val n = r * 7 + c - offset + 1
                                if (n < 1 || n > days) {
                                    Spacer(Modifier.weight(1f).height(44.dp))
                                } else {
                                    val day = month.withDayOfMonth(n)
                                    val isSel = day == selected
                                    Column(
                                        Modifier.weight(1f).height(44.dp).clip(MaterialTheme.shapes.small)
                                            .background(if (isSel) MaterialTheme.colorScheme.primaryContainer else Color.Transparent)
                                            .clickable { selected = day },
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text("$n", fontSize = 14.sp,
                                            color = if (day == Dt.today()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                            modifier = Modifier.padding(top = 4.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.padding(top = 2.dp)) {
                                            marks(day).forEach { col -> Box(Modifier.size(5.dp).clip(CircleShape).background(col)) }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            item { SectionHeader(Dt.dateLong(Dt.startOfDay(selected))) }
            val dayEvents = events.filter { Dt.toDate(it.startTime) == selected }
            val dayAppts = appts.filter { Dt.toDate(it.time) == selected }
            val dayAnnis = anniDays[selected].orEmpty()
            if (dayEvents.isEmpty() && dayAppts.isEmpty() && dayAnnis.isEmpty()) {
                item { Text("일정이 없어요", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            items(dayAnnis) { a -> ItemCard(a.emoji, a.title, "기념일") }
            items(dayAppts) { a -> ItemCard("🏥", a.title, Dt.time(a.time) + " · " + a.hospital, onClick = { nav.navigate("appointment") }) }
            items(dayEvents, key = { it.id }) { e ->
                ItemCard(
                    "📅", e.title, if (e.allDay) "종일" else Dt.time(e.startTime), detail = e.memo.takeIf { it.isNotBlank() },
                    accent = Color(e.color.argb), onClick = { dialog = e },
                    trailing = { DeleteButton { askDelete(e) } }
                )
            }
        }
    }

    dialog?.let { e ->
        var title by remember(e) { mutableStateOf(e.title) }
        var time by remember(e) { mutableStateOf(e.startTime) }
        var allDay by remember(e) { mutableStateOf(e.allDay) }
        var color by remember(e) { mutableStateOf(e.color) }
        var remind by remember(e) { mutableStateOf(e.remindMinutes) }
        var memo by remember(e) { mutableStateOf(e.memo) }
        FormDialog("일정", { dialog = null }, confirmEnabled = title.isNotBlank(), onConfirm = {
            vm.save(e.copy(title = title.trim(), startTime = time, allDay = allDay, color = color, remindMinutes = remind, memo = memo.trim())); dialog = null
        }) {
            AppTextField(title, { title = it }, "일정 이름")
            DateTimeFields(time) { time = it }
            SwitchRow("종일", allDay, { allDay = it })
            ChipSelector(FamilyColor.entries, color, { it.label }, { color = it })
            Text("알림", style = MaterialTheme.typography.bodySmall)
            ChipSelector(listOf(0, 10, 30, 60, 1440), remind, { if (it == 0) "없음" else if (it < 60) "${it}분 전" else if (it < 1440) "${it / 60}시간 전" else "하루 전" }, { remind = it })
            AppTextField(memo, { memo = it }, "메모")
        }
    }
}

// ═══════════════════════ 육아용품 체크 ═══════════════════════

class GearViewModel(app: Application) : BaseViewModel(app) {
    val items: StateFlow<List<GearItem>> = db.gearDao().observeAll().asState(emptyList())
    fun save(g: GearItem) = io { db.gearDao().upsert(g) }
    fun delete(g: GearItem) = io { db.gearDao().delete(g) }
    fun loadTemplate() = io {
        if (db.gearDao().count() == 0) {
            db.gearDao().insertAll(GearTemplates.items.flatMap { (cat, names) -> names.map { GearItem(category = cat, name = it) } })
        }
    }
}

@Composable
fun GearScreen(nav: NavController, vm: GearViewModel = viewModel()) {
    val items by vm.items.collectAsState()
    var dialog by remember { mutableStateOf<GearItem?>(null) }

    MomScaffold("육아용품 체크", nav, fabLabel = "항목 추가", onFab = { dialog = GearItem(category = "기타", name = "") }) { padding ->
        val done = items.count { it.checked }
        ListScreen(padding) {
            if (items.isEmpty()) {
                item { EmptyState("🧸", "준비물 목록이 비어있어요", "출산·신생아 필수 준비물 템플릿으로 시작해보세요.") }
                item { androidx.compose.material3.Button(onClick = { vm.loadTemplate() }, Modifier.fillMaxWidth()) { Text("기본 준비물 템플릿 불러오기") } }
            } else {
                item {
                    SectionCard(title = "준비 현황", emoji = "📦") {
                        Text("$done / ${items.size} 준비 완료")
                        ProgressBar(done.toFloat() / items.size)
                    }
                }
            }
            items.groupBy { it.category }.forEach { (cat, list) ->
                item { SectionHeader("$cat  ${list.count { it.checked }}/${list.size}") }
                items(list, key = { it.id }) { g ->
                    ItemCard(
                        emoji = if (g.checked) "✅" else "⬜", title = g.name,
                        subtitle = if (g.quantity > 1) "${g.quantity}개" else null,
                        detail = g.memo.takeIf { it.isNotBlank() },
                        onClick = { vm.save(g.copy(checked = !g.checked)) },
                        onLongClick = { dialog = g },
                        trailing = { DeleteButton { vm.delete(g) } }
                    )
                }
            }
        }
    }

    dialog?.let { g ->
        var name by remember(g) { mutableStateOf(g.name) }
        var cat by remember(g) { mutableStateOf(g.category) }
        var qty by remember(g) { mutableStateOf(g.quantity.toString()) }
        var memo by remember(g) { mutableStateOf(g.memo) }
        FormDialog("준비물", { dialog = null }, confirmEnabled = name.isNotBlank(), onConfirm = {
            vm.save(g.copy(name = name.trim(), category = cat.ifBlank { "기타" }, quantity = qty.toIntOrNull() ?: 1, memo = memo.trim())); dialog = null
        }) {
            AppTextField(name, { name = it }, "품목")
            AppTextField(cat, { cat = it }, "분류")
            ChipSelector(GearTemplates.items.map { it.first }, cat, { it }, { cat = it })
            NumberField(qty, { qty = it }, "수량")
            AppTextField(memo, { memo = it }, "메모")
        }
    }
}
