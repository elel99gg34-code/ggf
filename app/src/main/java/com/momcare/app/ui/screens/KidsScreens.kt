package com.momcare.app.ui.screens

import android.app.Application
import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.momcare.app.content.PlayContent
import com.momcare.app.content.TipContent
import com.momcare.app.data.Reward
import com.momcare.app.data.SchoolItem
import com.momcare.app.data.SchoolItemKind
import com.momcare.app.data.StickerLog
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.AppTextField
import com.momcare.app.ui.components.BulletList
import com.momcare.app.ui.components.ChildScaffold
import com.momcare.app.ui.components.ChipSelector
import com.momcare.app.ui.components.DeleteButton
import com.momcare.app.ui.components.EmptyState
import com.momcare.app.ui.components.FormDialog
import com.momcare.app.ui.components.InfoBanner
import com.momcare.app.ui.components.ItemCard
import com.momcare.app.ui.components.ListScreen
import com.momcare.app.ui.components.NumberField
import com.momcare.app.ui.components.Pill
import com.momcare.app.ui.components.ProgressBar
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.SectionHeader
import com.momcare.app.ui.components.StatPill
import com.momcare.app.ui.components.rememberDeleteTarget
import com.momcare.app.util.Dt
import kotlinx.coroutines.flow.StateFlow

// ═══════════════════════ 준비물·시간표 ═══════════════════════

class SchoolViewModel(app: Application) : BaseViewModel(app) {
    val items: StateFlow<List<SchoolItem>> = forChild(emptyList()) { db.schoolDao().observe(it) }
    fun save(s: SchoolItem) = io { db.schoolDao().upsert(s) }
    fun delete(s: SchoolItem) = io { db.schoolDao().delete(s) }
    fun resetSupplies(childId: Long) = io { db.schoolDao().uncheckSupplies(childId) }
}

@Composable
fun SchoolScreen(nav: NavController, vm: SchoolViewModel = viewModel()) {
    val items by vm.items.collectAsState()
    var dialog by remember { mutableStateOf<SchoolItem?>(null) }
    val todayDow = Dt.today().dayOfWeek.value
    val tomorrowDow = if (todayDow == 7) 1 else todayDow + 1
    var day by remember { mutableStateOf(tomorrowDow) }

    ChildScaffold("준비물·시간표", nav, fabLabel = "추가", onFab = { c ->
        dialog = SchoolItem(childId = c.id, kind = SchoolItemKind.SUPPLY, dayOfWeek = day, title = "")
    }, actions = {
        val child = com.momcare.app.ui.components.LocalChild.current
        if (child != null) TextButton(onClick = { vm.resetSupplies(child.id) }) { Text("체크 초기화") }
    }) { child, padding ->
        val forDay = items.filter { it.dayOfWeek == day || it.dayOfWeek == 0 }
        val timetable = forDay.filter { it.kind == SchoolItemKind.TIMETABLE }.sortedBy { it.timeText }
        val supplies = forDay.filter { it.kind == SchoolItemKind.SUPPLY }
        ListScreen(padding) {
            item {
                ChipSelector((1..7).toList(), day, { d ->
                    Dt.dayName(d) + when (d) { todayDow -> "(오늘)"; tomorrowDow -> "(내일)"; else -> "" }
                }, { day = it })
            }
            item {
                SectionCard(title = "${Dt.dayName(day)}요일 준비물 ${supplies.count { it.checked }}/${supplies.size}", emoji = "🎒") {
                    if (supplies.isEmpty()) Text("등록된 준비물이 없어요", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    else ProgressBar(supplies.count { it.checked }.toFloat() / supplies.size)
                    supplies.forEach { s ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(s.checked, { vm.save(s.copy(checked = it)) })
                            Text(s.title + if (s.dayOfWeek == 0) " (매일)" else "", Modifier.weight(1f))
                            DeleteButton { vm.delete(s) }
                        }
                    }
                }
            }
            item { SectionHeader("${Dt.dayName(day)}요일 시간표") }
            if (timetable.isEmpty()) item { Text("시간표가 없어요", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(timetable, key = { it.id }) { t ->
                ItemCard("⏰", t.title, t.timeText.ifBlank { null }, onClick = { dialog = t }, trailing = { DeleteButton { vm.delete(t) } })
            }
        }

        dialog?.let { s ->
            var title by remember(s) { mutableStateOf(s.title) }
            var kind by remember(s) { mutableStateOf(s.kind) }
            var dow by remember(s) { mutableStateOf(s.dayOfWeek) }
            var time by remember(s) { mutableStateOf(s.timeText) }
            FormDialog("${child.name} 준비물·시간표", { dialog = null }, confirmEnabled = title.isNotBlank(), onConfirm = {
                vm.save(s.copy(title = title.trim(), kind = kind, dayOfWeek = dow, timeText = time.trim())); dialog = null
            }) {
                ChipSelector(SchoolItemKind.entries, kind, { it.label }, { kind = it })
                AppTextField(title, { title = it }, if (kind == SchoolItemKind.SUPPLY) "준비물 (예: 여벌옷, 수저)" else "활동 (예: 체육, 영어)")
                ChipSelector((0..7).toList(), dow, { if (it == 0) "매일" else Dt.dayName(it) }, { dow = it })
                if (kind == SchoolItemKind.TIMETABLE) AppTextField(time, { time = it }, "시간 (예: 10:00)")
            }
        }
    }
}

// ═══════════════════════ 칭찬 스티커 ═══════════════════════

class RewardViewModel(app: Application) : BaseViewModel(app) {
    val stickers: StateFlow<List<StickerLog>> = forChild(emptyList()) { db.rewardDao().observeStickers(it) }
    val rewards: StateFlow<List<Reward>> = forChild(emptyList()) { db.rewardDao().observeRewards(it) }
    fun addSticker(childId: Long, reason: String, emoji: String) =
        io { db.rewardDao().insertSticker(StickerLog(childId = childId, date = Dt.now(), reason = reason, emoji = emoji)) }
    fun deleteSticker(s: StickerLog) = io { db.rewardDao().deleteSticker(s) }
    fun saveReward(r: Reward) = io { db.rewardDao().upsertReward(r) }
    fun deleteReward(r: Reward) = io { db.rewardDao().deleteReward(r) }
}

@Composable
fun RewardScreen(nav: NavController, vm: RewardViewModel = viewModel()) {
    val stickers by vm.stickers.collectAsState()
    val rewards by vm.rewards.collectAsState()
    var addSticker by remember { mutableStateOf(false) }
    var rewardDialog by remember { mutableStateOf<Reward?>(null) }
    val askDelete = rememberDeleteTarget<StickerLog>({ vm.deleteSticker(it) })

    ChildScaffold("칭찬 스티커", nav, fabLabel = "스티커 주기", onFab = { addSticker = true }) { child, padding ->
        val earned = stickers.sumOf { it.count }
        val spent = rewards.filter { it.redeemedAt != null }.sumOf { it.cost }
        val balance = earned - spent
        ListScreen(padding) {
            item {
                SectionCard(title = "${child.name}의 스티커판", emoji = "⭐") {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("모은 스티커", "$earned", Modifier.weight(1f))
                        StatPill("사용 가능", "$balance", Modifier.weight(1f), MaterialTheme.colorScheme.tertiary)
                    }
                    Text(stickers.take(30).joinToString("") { it.emoji }, fontSize = 22.sp)
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    SectionHeader("보상 목록", Modifier.weight(1f))
                    TextButton(onClick = { rewardDialog = Reward(childId = child.id, title = "", cost = 10) }) { Text("+ 보상 추가") }
                }
            }
            if (rewards.isEmpty()) item { Text("아이와 함께 보상을 정해보세요 (예: 놀이터 30분 = 스티커 10개)", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(rewards, key = { it.id }) { r ->
                val redeemed = r.redeemedAt != null
                SectionCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        androidx.compose.foundation.layout.Column(Modifier.weight(1f)) {
                            Text("🎁 ${r.title}", style = MaterialTheme.typography.titleMedium)
                            Text(if (redeemed) "${Dt.date(r.redeemedAt!!)} 교환 완료" else "스티커 ${r.cost}개", style = MaterialTheme.typography.bodySmall)
                        }
                        if (!redeemed) {
                            Button(onClick = { vm.saveReward(r.copy(redeemedAt = Dt.now())) }, enabled = balance >= r.cost) { Text("교환") }
                        } else Pill("✔")
                        DeleteButton { vm.deleteReward(r) }
                    }
                    if (!redeemed) ProgressBar((balance.toFloat() / r.cost).coerceIn(0f, 1f))
                }
            }
            item { SectionHeader("받은 스티커") }
            if (stickers.isEmpty()) item { EmptyState("⭐", "아직 스티커가 없어요", "작은 행동도 구체적으로 칭찬해주세요.") }
            items(stickers.take(50), key = { it.id }) { s ->
                ItemCard(s.emoji, s.reason, Dt.dateWeek(s.date), trailing = { DeleteButton { askDelete(s) } })
            }
        }

        if (addSticker) {
            var reason by remember { mutableStateOf("") }
            var emoji by remember { mutableStateOf("⭐") }
            FormDialog("스티커 주기", { addSticker = false }, confirmEnabled = reason.isNotBlank(), onConfirm = {
                vm.addSticker(child.id, reason.trim(), emoji); addSticker = false
            }) {
                AppTextField(reason, { reason = it }, "칭찬 이유 (구체적으로)")
                ChipSelector(listOf("스스로 양치했어요", "장난감 정리", "동생에게 양보", "골고루 먹었어요", "인사 잘했어요"), null, { it }, { reason = it })
                ChipSelector(listOf("⭐", "🌟", "💖", "🏅", "🐶", "🦄", "🍀"), emoji, { it }, { emoji = it })
            }
        }
        rewardDialog?.let { r ->
            var title by remember(r) { mutableStateOf(r.title) }
            var cost by remember(r) { mutableStateOf(r.cost.toString()) }
            FormDialog("보상", { rewardDialog = null }, confirmEnabled = title.isNotBlank() && (cost.toIntOrNull() ?: 0) > 0, onConfirm = {
                vm.saveReward(r.copy(title = title.trim(), cost = cost.toInt())); rewardDialog = null
            }) {
                AppTextField(title, { title = it }, "보상 (예: 주말 키즈카페)")
                NumberField(cost, { cost = it.filter { c -> c.isDigit() } }, "필요한 스티커 수", "개")
            }
        }
    }
}

// ═══════════════════════ 놀이 추천 ═══════════════════════

@Composable
fun PlayScreen(nav: NavController) {
    var place by remember { mutableStateOf("전체") }
    var open by remember { mutableStateOf<String?>(null) }
    ChildScaffold("놀이 추천", nav) { child, padding ->
        val months = Dt.monthsBetween(child.birthDate)
        val ideas = PlayContent.forMonth(months).filter { place == "전체" || it.place.contains(place) }
        ListScreen(padding) {
            item { InfoBanner("${child.name}(${Dt.ageShort(child.birthDate)})에게 맞는 놀이 ${ideas.size}가지예요.", "🧩") }
            item { ChipSelector(listOf("전체", "실내", "야외", "욕실", "주방"), place, { it }, { place = it }) }
            if (ideas.isEmpty()) item { EmptyState("🧩", "조건에 맞는 놀이가 없어요") }
            items(ideas, key = { it.title }) { p ->
                SectionCard(title = p.title, emoji = p.emoji, modifier = Modifier.clickable { open = if (open == p.title) null else p.title }) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { Pill(p.place); Pill(p.domain); Pill("${p.fromMonth}~${p.toMonth}개월") }
                    Text("준비물: ${p.materials}", style = MaterialTheme.typography.bodySmall)
                    if (open == p.title) {
                        BulletList(p.howTo, "👉")
                        Text("효과: ${p.effect}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

// ═══════════════════════ 월령별 육아 팁 ═══════════════════════

@Composable
fun TipsScreen(nav: NavController) {
    val ctx = LocalContext.current
    ChildScaffold("월령별 육아 팁", nav) { child, padding ->
        val months = Dt.monthsBetween(child.birthDate)
        val current = TipContent.forMonth(months)
        ListScreen(padding) {
            item {
                SectionCard(title = "지금 ${child.name}에게 (${Dt.ageText(child.birthDate)})", emoji = current.emoji,
                    container = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)) {
                    Text(current.title, style = MaterialTheme.typography.titleMedium)
                    BulletList(current.points)
                    OutlinedButton(onClick = {
                        val text = "[${current.title}]\n" + current.points.joinToString("\n") { "• $it" }
                        ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"; putExtra(Intent.EXTRA_TEXT, text)
                        }, "육아 팁 공유"))
                    }) { Text("가족에게 공유") }
                }
            }
            item { SectionHeader("전체 시기") }
            items(TipContent.all, key = { it.fromMonth }) { t ->
                SectionCard(title = t.title, emoji = t.emoji) {
                    if (t == current) Pill("지금 시기")
                    BulletList(t.points)
                }
            }
        }
    }
}
