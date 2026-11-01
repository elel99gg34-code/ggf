package com.momcare.app.ui.screens

import android.app.Application
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.momcare.app.data.Child
import com.momcare.app.data.DiaperLog
import com.momcare.app.data.DiaperType
import com.momcare.app.data.FeedingLog
import com.momcare.app.data.HealthLog
import com.momcare.app.data.SleepLog
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.BarChart
import com.momcare.app.ui.components.BarItem
import com.momcare.app.ui.components.ChildScaffold
import com.momcare.app.ui.components.ChipSelector
import com.momcare.app.ui.components.ScrollScreen
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.StatPill
import com.momcare.app.ui.visibilityFlow
import com.momcare.app.util.Dt
import kotlinx.coroutines.flow.StateFlow

class ReportViewModel(app: Application) : BaseViewModel(app) {
    val feedings: StateFlow<List<FeedingLog>> = forChild(emptyList()) { db.feedingDao().observeRecent(it, 500) }
    val sleeps: StateFlow<List<SleepLog>> = forChild(emptyList()) { db.sleepDao().observeRecent(it, 300) }
    val diapers: StateFlow<List<DiaperLog>> = forChild(emptyList()) { db.diaperDao().observeRecent(it, 500) }
    val health: StateFlow<List<HealthLog>> = forChild(emptyList()) { db.healthDao().observeRecent(it, 100) }
    val visibility = visibilityFlow()
}

/** 기간 요약 수치 */
private data class Summary(
    val feeds: Int, val ml: Int, val breastMin: Int,
    val sleepMs: Long, val naps: Int,
    val pee: Int, val poo: Int,
    val maxTemp: Double?, val symptoms: List<String>
)

private fun summarize(
    from: Long, to: Long,
    feedings: List<FeedingLog>, sleeps: List<SleepLog>, diapers: List<DiaperLog>, health: List<HealthLog>
): Summary {
    val f = feedings.filter { it.time in from until to }
    val s = sleeps.filter { it.startTime in from until to }
    val d = diapers.filter { it.time in from until to }
    val h = health.filter { it.time in from until to }
    return Summary(
        feeds = f.size, ml = f.sumOf { it.amountMl }, breastMin = f.sumOf { it.durationMin },
        sleepMs = s.sumOf { (it.endTime ?: Dt.now()) - it.startTime }, naps = s.count { it.type.name == "NAP" },
        pee = d.count { it.type == DiaperType.PEE || it.type == DiaperType.BOTH },
        poo = d.count { it.type == DiaperType.POO || it.type == DiaperType.BOTH },
        maxTemp = h.mapNotNull { it.tempC }.maxOrNull(),
        symptoms = h.flatMap { it.symptoms.split(",") }.filter { it.isNotBlank() }.distinct()
    )
}

@Composable
fun ReportScreen(nav: NavController, vm: ReportViewModel = viewModel()) {
    val feedings by vm.feedings.collectAsState()
    val sleeps by vm.sleeps.collectAsState()
    val diapers by vm.diapers.collectAsState()
    val health by vm.health.collectAsState()
    val visibility by vm.visibility.collectAsState()
    val ctx = LocalContext.current
    var range by remember { mutableStateOf(1) }

    ChildScaffold("일일·주간 리포트", nav) { child, padding ->
        val to = Dt.todayStart() + Dt.DAY_MS
        val from = to - range * Dt.DAY_MS
        val sum = summarize(from, to, feedings, sleeps, diapers, health)
        val days = (range - 1 downTo 0).map { Dt.todayStart() - it * Dt.DAY_MS }

        ScrollScreen(padding) {
            ChipSelector(listOf(1, 3, 7, 14), range, { if (it == 1) "오늘" else "최근 ${it}일" }, { range = it })
            SectionCard(title = "${child.name} · ${Dt.ageText(child.birthDate)}", emoji = "📊") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatPill("수유", "${sum.feeds}회", Modifier.weight(1f))
                    StatPill("수유량", "${sum.ml}ml", Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                    StatPill("수면", Dt.durationText(sum.sleepMs), Modifier.weight(1f), MaterialTheme.colorScheme.tertiary)
                }
                if (visibility.diaper) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("소변", "${sum.pee}회", Modifier.weight(1f))
                        StatPill("대변", "${sum.poo}회", Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                    }
                }
                sum.maxTemp?.let { Text("최고 체온 $it℃", style = MaterialTheme.typography.bodyLarge, color = if (it >= 38) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface) }
                if (sum.symptoms.isNotEmpty()) Text("증상: ${sum.symptoms.joinToString(", ")}", style = MaterialTheme.typography.bodyMedium)
            }
            if (range > 1) {
                SectionCard(title = "일별 수유 횟수", emoji = "🍼") {
                    BarChart(days.map { d -> BarItem(Dt.short(d), feedings.count { it.time in d until d + Dt.DAY_MS }.toFloat()) })
                }
                SectionCard(title = "일별 수면 시간", emoji = "🌙") {
                    BarChart(
                        days.map { d -> BarItem(Dt.short(d), sleeps.filter { it.startTime in d until d + Dt.DAY_MS }.sumOf { (it.endTime ?: it.startTime) - it.startTime } / 3_600_000f) },
                        valueLabel = { "%.1f".format(it) }, defaultColor = MaterialTheme.colorScheme.secondary
                    )
                }
            }
            Button(onClick = {
                val text = reportText(child, range, sum, visibility.diaper)
                ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"; putExtra(Intent.EXTRA_TEXT, text)
                }, "리포트 공유"))
            }, Modifier.fillMaxWidth()) { Text("📤 진료용 요약 공유하기") }
            Text(
                "소아과 진료 때 보여주거나 가족에게 보낼 수 있는 텍스트 요약이에요.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun reportText(child: Child, range: Int, s: Summary, diaper: Boolean): String = buildString {
    appendLine("[${child.name} 육아 기록 요약 - ${if (range == 1) "오늘" else "최근 ${range}일"}]")
    appendLine("${Dt.ageText(child.birthDate)} (${Dt.date(child.birthDate)}생)")
    appendLine("• 수유 ${s.feeds}회, 총 ${s.ml}ml" + if (s.breastMin > 0) ", 모유 ${s.breastMin}분" else "")
    appendLine("• 수면 ${Dt.durationText(s.sleepMs)} (낮잠 ${s.naps}회)")
    if (diaper) appendLine("• 소변 ${s.pee}회, 대변 ${s.poo}회")
    s.maxTemp?.let { appendLine("• 최고 체온 ${it}℃") }
    if (s.symptoms.isNotEmpty()) appendLine("• 증상: ${s.symptoms.joinToString(", ")}")
    append("(맘케어 앱 기록)")
}
