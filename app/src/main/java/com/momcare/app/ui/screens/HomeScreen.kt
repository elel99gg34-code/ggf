package com.momcare.app.ui.screens

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.momcare.app.content.CounselContent
import com.momcare.app.content.PregnancyContent
import com.momcare.app.content.SelfCareContent
import com.momcare.app.content.TipContent
import com.momcare.app.data.Anniversary
import com.momcare.app.data.Appointment
import com.momcare.app.data.Child
import com.momcare.app.data.CounselCheckin
import com.momcare.app.data.DiaperLog
import com.momcare.app.data.FeedingLog
import com.momcare.app.data.SleepLog
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.RootViewModel
import com.momcare.app.ui.components.LocalChild
import com.momcare.app.ui.components.LocalChildren
import com.momcare.app.ui.components.MomScaffold
import com.momcare.app.ui.components.Pill
import com.momcare.app.ui.components.ProgressBar
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.StatPill
import com.momcare.app.ui.nav.Feature
import com.momcare.app.ui.nav.Features
import com.momcare.app.ui.nav.Routes
import com.momcare.app.ui.nav.Visibility
import com.momcare.app.ui.theme.childColor
import com.momcare.app.util.Dt
import kotlinx.coroutines.flow.StateFlow

class HomeViewModel(app: Application) : BaseViewModel(app) {
    val feedings: StateFlow<List<FeedingLog>> = forChild(emptyList()) { db.feedingDao().observeRecent(it, 100) }
    val sleeps: StateFlow<List<SleepLog>> = forChild(emptyList()) { db.sleepDao().observeRecent(it, 60) }
    val diapers: StateFlow<List<DiaperLog>> = forChild(emptyList()) { db.diaperDao().observeRecent(it, 100) }
    val nextAppointment: StateFlow<Appointment?> = db.appointmentDao().observeNext(Dt.now()).asState(null)
    val anniversaries: StateFlow<List<Anniversary>> = db.anniversaryDao().observeAll().asState(emptyList())
    val openTodos: StateFlow<Int> = db.todoDao().observeOpenCount().asState(0)
    val checkins: StateFlow<List<CounselCheckin>> = db.counselDao().observeCheckins(60).asState(emptyList())
    val dueDate: StateFlow<Long> = prefs.dueDate
    val session = container.session.session
}

@Composable
fun HomeScreen(nav: NavController, root: RootViewModel, vm: HomeViewModel = viewModel()) {
    val visibility by root.visibility.collectAsState()
    val momName by root.momName.collectAsState()
    val checkins by vm.checkins.collectAsState()
    val session by vm.session.collectAsState()

    val skill = CounselContent.dailySkill(Dt.dayEpoch())
    val streak = counselStreak(checkins.map { it.dayEpoch }.toSet())
    val groups = Features.byGroup(visibility)

    MomScaffold(
        title = "맘케어",
        nav = null,
        actions = {
            IconButton(onClick = { nav.navigate(Routes.SETTINGS) }) {
                Icon(Icons.Default.Settings, contentDescription = "설정")
            }
        }
    ) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(
                start = 16.dp, end = 16.dp,
                top = padding.calculateTopPadding() + 4.dp,
                bottom = padding.calculateBottomPadding() + 32.dp
            ),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item { Greeting(momName, session?.nickname, onLogin = { nav.navigate(Routes.LOGIN) }, loggedIn = session != null) }

            if (visibility.child) {
                item { ChildSection(nav, root, vm, visibility) }
            }
            if (visibility.pregnancy) {
                item { PregnancyCard(nav, vm) }
            }

            item { UpcomingCard(nav, vm) }

            item {
                SectionCard(
                    title = "오늘의 상담 스킬", emoji = "💬",
                    container = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                ) {
                    Row(
                        Modifier.fillMaxWidth().clickable { nav.navigate(Routes.counselSkill(skill.id)) },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(skill.emoji, fontSize = 30.sp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(skill.title, style = MaterialTheme.typography.titleMedium)
                            Text(skill.summary, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Pill("🔥 연속 ${streak}일")
                        Text(
                            "알람 설정 →", color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.clickable { nav.navigate(Routes.COUNSEL_ALARM) }
                        )
                    }
                }
            }

            item {
                Text(
                    "“" + SelfCareContent.affirmationFor(Dt.dayEpoch()) + "”",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
            }

            groups.forEach { (group, list) ->
                item {
                    Text(
                        "${group.emoji} ${group.title}",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(top = 6.dp)
                    )
                }
                items(list.chunked(2)) { row -> FeatureRow(row) { nav.navigate(it.route) } }
            }

            val hidden = Features.hiddenCount(visibility)
            if (hidden > 0) {
                item {
                    Text(
                        "🔒 비공개 기능 ${hidden}개가 숨겨져 있어요 · 설정에서 열기",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth().clickable { nav.navigate(Routes.SETTINGS) }.padding(8.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun Greeting(momName: String, nickname: String?, loggedIn: Boolean, onLogin: () -> Unit) {
    Column {
        Text("${nickname ?: momName}님, 오늘도 수고했어요 💗", style = MaterialTheme.typography.headlineMedium)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                Dt.dateLong(Dt.now()),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f)
            )
            if (!loggedIn) {
                Text(
                    "로그인 · 백업", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clip(CircleShape).clickable(onClick = onLogin).padding(6.dp)
                )
            } else {
                Pill("☁️ 연결됨")
            }
        }
    }
}

@Composable
private fun ChildSection(nav: NavController, root: RootViewModel, vm: HomeViewModel, visibility: Visibility) {
    val child = LocalChild.current
    val children = LocalChildren.current
    val feedings by vm.feedings.collectAsState()
    val sleeps by vm.sleeps.collectAsState()
    val diapers by vm.diapers.collectAsState()

    if (children.isEmpty() || child == null) {
        SectionCard(title = "아이를 등록해보세요", emoji = "👶") {
            Text(
                "아이 프로필을 만들면 수유, 수면, 성장, 접종 기록을 시작할 수 있어요.",
                style = MaterialTheme.typography.bodyMedium
            )
            Button(onClick = { nav.navigate(Routes.CHILDREN) }) { Text("아이 등록하기") }
        }
        return
    }

    val todayStart = Dt.todayStart()
    val todayEnd = todayStart + Dt.DAY_MS
    val todayFeed = feedings.filter { it.time in todayStart until todayEnd }
    val todayDiaper = diapers.filter { it.time in todayStart until todayEnd }
    val todaySleepMs = sleeps.filter { it.startTime in todayStart until todayEnd }
        .sumOf { (it.endTime ?: Dt.now()) - it.startTime }
    val tip = TipContent.forMonth(Dt.monthsBetween(child.birthDate))

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ChildSwitcher(root, nav, children, child)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatPill("오늘 수유", "${todayFeed.size}회", Modifier.weight(1f))
            StatPill("오늘 수면", Dt.durationText(todaySleepMs), Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
            if (visibility.diaper) {
                StatPill("기저귀", "${todayDiaper.size}회", Modifier.weight(1f), MaterialTheme.colorScheme.tertiary)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            QuickButton("🍼", "수유", Modifier.weight(1f)) { nav.navigate(Routes.FEEDING) }
            QuickButton("🌙", "수면", Modifier.weight(1f)) { nav.navigate(Routes.SLEEP) }
            if (visibility.diaper) {
                QuickButton("🧷", "기저귀", Modifier.weight(1f)) { nav.navigate(Routes.DIAPER) }
            }
            QuickButton("🌡️", "체온", Modifier.weight(1f)) { nav.navigate(Routes.HEALTH) }
        }
        feedings.firstOrNull()?.let { last ->
            SectionCard(title = "마지막 수유", emoji = "🍼") {
                Text(
                    "${Dt.relative(last.time)} · ${last.type.label}" +
                        if (last.amountMl > 0) " ${last.amountMl}ml" else "",
                    style = MaterialTheme.typography.bodyLarge
                )
                Text(
                    "패턴 분석 보기 →", color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.clickable { nav.navigate(Routes.PATTERN) }
                )
            }
        }
        SectionCard(title = "${Dt.ageText(child.birthDate)} 육아 팁", emoji = tip.emoji) {
            Text(tip.title, style = MaterialTheme.typography.titleMedium)
            Text(tip.points.first(), style = MaterialTheme.typography.bodyMedium)
            Text(
                "더 보기 →", color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clickable { nav.navigate(Routes.TIPS) }
            )
        }
    }
}

@Composable
private fun PregnancyCard(nav: NavController, vm: HomeViewModel) {
    val due by vm.dueDate.collectAsState()
    SectionCard(title = "임신·출산", emoji = "🤰", modifier = Modifier.clickable { nav.navigate(Routes.PREGNANCY) }) {
        if (due <= 0) {
            Text("출산 예정일을 입력하면 주차별 정보를 보여드려요.", style = MaterialTheme.typography.bodyMedium)
        } else {
            val daysLeft = Dt.dDay(due)
            val days = PregnancyContent.TOTAL_DAYS - daysLeft
            val week = (days / 7).coerceIn(0, 42)
            Text("임신 ${week}주 ${days.mod(7)}일 · ${Dt.dDayText(daysLeft)}", style = MaterialTheme.typography.titleMedium)
            ProgressBar(days.toFloat() / PregnancyContent.TOTAL_DAYS)
            Text(PregnancyContent.infoFor(week).baby, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun UpcomingCard(nav: NavController, vm: HomeViewModel) {
    val appt by vm.nextAppointment.collectAsState()
    val annis by vm.anniversaries.collectAsState()
    val todos by vm.openTodos.collectAsState()
    val upcomingAnni = annis.map { a ->
        val next = if (a.repeatYearly) Dt.nextYearly(a.date) else a.date
        a to Dt.dDay(next)
    }.filter { it.second >= 0 }.minByOrNull { it.second }

    if (appt == null && upcomingAnni == null && todos == 0) return
    SectionCard(title = "곧 다가오는 일", emoji = "🗓️") {
        appt?.let {
            Row(Modifier.fillMaxWidth().clickable { nav.navigate(Routes.APPOINTMENT) }) {
                Text("🏥 ${it.title}", Modifier.weight(1f))
                Text(Dt.dateTime(it.time), style = MaterialTheme.typography.bodySmall)
            }
        }
        upcomingAnni?.let { (a, d) ->
            Row(Modifier.fillMaxWidth().clickable { nav.navigate(Routes.ANNIVERSARY) }) {
                Text("${a.emoji} ${a.title}", Modifier.weight(1f))
                Pill(Dt.dDayText(d))
            }
        }
        if (todos > 0) {
            Row(Modifier.fillMaxWidth().clickable { nav.navigate(Routes.TODO) }) {
                Text("✅ 남은 할 일", Modifier.weight(1f))
                Pill("${todos}개")
            }
        }
    }
}

fun counselStreak(days: Set<Long>): Int {
    var d = Dt.dayEpoch()
    if (d !in days) d -= 1
    var count = 0
    while (d in days) { count++; d-- }
    return count
}

@Composable
private fun ChildSwitcher(root: RootViewModel, nav: NavController, children: List<Child>, current: Child) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(children, key = { it.id }) { c ->
                val selected = c.id == current.id
                Row(
                    Modifier.clip(CircleShape)
                        .background(if (selected) childColor(c.colorIndex) else MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { root.select(c.id) }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(c.gender.emoji)
                    Spacer(Modifier.width(6.dp))
                    Text(
                        c.name,
                        color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }
            item {
                Box(
                    Modifier.clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { nav.navigate(Routes.CHILDREN) }.padding(horizontal = 14.dp, vertical = 8.dp)
                ) { Text("＋ 관리") }
            }
        }
        Text(
            "${current.name} · ${Dt.ageText(current.birthDate)} · 태어난 지 ${Dt.daysSinceBirth(current.birthDate)}일째",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun FeatureRow(row: List<Feature>, onClick: (Feature) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        row.forEach { f -> FeatureTile(f, Modifier.weight(1f)) { onClick(f) } }
        if (row.size == 1) Spacer(Modifier.weight(1f))
    }
}

@Composable
private fun QuickButton(emoji: String, label: String, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier.clip(MaterialTheme.shapes.medium)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(emoji, fontSize = 24.sp)
        Text(label, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun FeatureTile(f: Feature, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier.clip(MaterialTheme.shapes.medium)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(14.dp)
            .height(78.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Text(f.emoji, fontSize = 24.sp)
        Column {
            Text(f.title, style = MaterialTheme.typography.titleMedium, maxLines = 1)
            Text(
                f.desc, style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1
            )
        }
    }
}
