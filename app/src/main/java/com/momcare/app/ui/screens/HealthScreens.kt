@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.momcare.app.ui.screens

import android.app.Application
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.momcare.app.content.GrowthMetric
import com.momcare.app.content.GrowthStandards
import com.momcare.app.content.MilestoneContent
import com.momcare.app.content.MilestoneDomain
import com.momcare.app.content.SymptomContent
import com.momcare.app.content.VaccineContent
import com.momcare.app.data.Allergy
import com.momcare.app.data.Appointment
import com.momcare.app.data.Child
import com.momcare.app.data.GrowthRecord
import com.momcare.app.data.HealthLog
import com.momcare.app.data.Medication
import com.momcare.app.data.MedicationLog
import com.momcare.app.data.MilestoneRecord
import com.momcare.app.data.Severity
import com.momcare.app.data.VaccineRecord
import com.momcare.app.notif.Reminders
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.components.AppTextField
import com.momcare.app.ui.components.BulletList
import com.momcare.app.ui.components.ChartSeries
import com.momcare.app.ui.components.ChildScaffold
import com.momcare.app.ui.components.ChipSelector
import com.momcare.app.ui.components.DateField
import com.momcare.app.ui.components.DateTimeFields
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
import com.momcare.app.ui.components.ProgressBar
import com.momcare.app.ui.components.ScrollScreen
import com.momcare.app.ui.components.SectionCard
import com.momcare.app.ui.components.SectionHeader
import com.momcare.app.ui.components.StatPill
import com.momcare.app.ui.components.SwitchRow
import com.momcare.app.ui.components.rememberDeleteTarget
import com.momcare.app.ui.theme.Lavender
import com.momcare.app.ui.theme.Mint
import com.momcare.app.ui.theme.Rose
import com.momcare.app.ui.theme.Sky
import com.momcare.app.util.Dt
import kotlinx.coroutines.flow.StateFlow

// ═══════════════════════ 성장 기록 ═══════════════════════

class GrowthViewModel(app: Application) : BaseViewModel(app) {
    val records: StateFlow<List<GrowthRecord>> = forChild(emptyList()) { db.growthDao().observe(it) }
    fun save(r: GrowthRecord) = io { db.growthDao().upsert(r) }
    fun delete(r: GrowthRecord) = io { db.growthDao().delete(r) }
}

@Composable
fun GrowthScreen(nav: NavController, vm: GrowthViewModel = viewModel()) {
    val records by vm.records.collectAsState()
    var dialog by remember { mutableStateOf<GrowthRecord?>(null) }
    var metric by remember { mutableStateOf(GrowthMetric.HEIGHT) }
    val askDelete = rememberDeleteTarget<GrowthRecord>({ vm.delete(it) })

    ChildScaffold("성장 기록", nav, fabLabel = "측정 기록", onFab = { c ->
        dialog = GrowthRecord(childId = c.id, date = Dt.todayStart())
    }) { child, padding ->
        val sorted = records.sortedBy { it.date }
        val latest = records.maxByOrNull { it.date }
        val prev = sorted.dropLast(1).lastOrNull()
        fun months(r: GrowthRecord) = Dt.monthsBetween(child.birthDate, r.date).toFloat()
        val pts = sorted.mapNotNull { r ->
            val v = if (metric == GrowthMetric.HEIGHT) r.heightCm else r.weightKg
            v?.let { months(r) to it.toFloat() }
        }
        ListScreen(padding) {
            item {
                SectionCard(title = "최근 측정", emoji = "📏") {
                    if (latest == null) Text("아직 기록이 없어요")
                    else {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            StatPill("키", latest.heightCm?.let { "%.1fcm".format(it) } ?: "-", Modifier.weight(1f), Rose)
                            StatPill("몸무게", latest.weightKg?.let { "%.2fkg".format(it) } ?: "-", Modifier.weight(1f), Sky)
                            StatPill("머리둘레", latest.headCm?.let { "%.1fcm".format(it) } ?: "-", Modifier.weight(1f), Lavender)
                        }
                        val h = latest.heightCm
                        val w = latest.weightKg
                        if (h != null && w != null) {
                            Text("BMI %.1f".format(GrowthStandards.bmi(h, w)), style = MaterialTheme.typography.bodyMedium)
                        }
                        if (prev != null) {
                            val dh = (latest.heightCm ?: 0.0) - (prev.heightCm ?: 0.0)
                            val dw = (latest.weightKg ?: 0.0) - (prev.weightKg ?: 0.0)
                            Text(
                                "직전 대비 키 %+.1fcm, 몸무게 %+.2fkg".format(dh, dw),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
            item { ChipSelector(GrowthMetric.entries, metric, { it.label }, { metric = it }) }
            item {
                SectionCard(title = "${metric.label} 그래프 (월령 기준)", emoji = "📈") {
                    LineChart(
                        listOf(
                            ChartSeries("평균", GrowthStandards.curve(child.gender, metric, 72, 0.0), Color.Gray, dashed = true, showDots = false, strokeWidth = 2f),
                            ChartSeries("${child.name}", pts, if (metric == GrowthMetric.HEIGHT) Rose else Sky)
                        ),
                        xLabel = { "${it.toInt()}개월" }, yLabel = { "%.0f".format(it) }
                    )
                }
            }
            item { SectionHeader("측정 이력") }
            if (records.isEmpty()) item { EmptyState("📏", "성장 기록이 없어요") }
            items(records, key = { it.id }) { r ->
                ItemCard(
                    emoji = "📏", title = Dt.date(r.date),
                    subtitle = Dt.ageText(child.birthDate, r.date),
                    detail = listOfNotNull(
                        r.heightCm?.let { "키 ${it}cm" }, r.weightKg?.let { "몸무게 ${it}kg" },
                        r.headCm?.let { "머리 ${it}cm" }, r.memo.takeIf { it.isNotBlank() }
                    ).joinToString(" · "),
                    onClick = { dialog = r },
                    trailing = { DeleteButton { askDelete(r) } }
                )
            }
        }
    }

    dialog?.let { r ->
        var date by remember(r) { mutableStateOf(r.date) }
        var h by remember(r) { mutableStateOf(r.heightCm?.toString() ?: "") }
        var w by remember(r) { mutableStateOf(r.weightKg?.toString() ?: "") }
        var hc by remember(r) { mutableStateOf(r.headCm?.toString() ?: "") }
        var memo by remember(r) { mutableStateOf(r.memo) }
        FormDialog("성장 측정", { dialog = null },
            confirmEnabled = h.isNotBlank() || w.isNotBlank() || hc.isNotBlank(),
            onConfirm = {
                vm.save(r.copy(date = date, heightCm = h.toDoubleOrNull(), weightKg = w.toDoubleOrNull(),
                    headCm = hc.toDoubleOrNull(), memo = memo.trim()))
                dialog = null
            }) {
            DateField("측정일", date, { date = it })
            NumberField(h, { h = it }, "키", "cm")
            NumberField(w, { w = it }, "몸무게", "kg")
            NumberField(hc, { hc = it }, "머리둘레", "cm")
            AppTextField(memo, { memo = it }, "메모")
        }
    }
}

// ═══════════════════════ 또래 비교 ═══════════════════════

@Composable
fun GrowthCompareScreen(nav: NavController, vm: GrowthViewModel = viewModel()) {
    val records by vm.records.collectAsState()
    ChildScaffold("또래 비교 (백분위)", nav) { child, padding ->
        val latestH = records.filter { it.heightCm != null }.maxByOrNull { it.date }
        val latestW = records.filter { it.weightKg != null }.maxByOrNull { it.date }
        ScrollScreen(padding) {
            InfoBanner("WHO 성장 기준을 단순화한 참고용 근사치예요. 정확한 판단은 소아과의 성장곡선을 따르세요.", "ℹ️")
            if (child.gender.name == "UNKNOWN") {
                InfoBanner("성별이 '미정'이면 여아 기준으로 계산해요. 아이 프로필에서 성별을 지정해주세요.", "👶", warn = true)
            }
            listOf(
                Triple(GrowthMetric.HEIGHT, latestH, latestH?.heightCm),
                Triple(GrowthMetric.WEIGHT, latestW, latestW?.weightKg)
            ).forEach { (metric, rec, value) ->
                SectionCard(title = metric.label, emoji = if (metric == GrowthMetric.HEIGHT) "📏" else "⚖️") {
                    if (rec == null || value == null) {
                        Text("측정 기록이 필요해요", style = MaterialTheme.typography.bodyMedium)
                    } else {
                        val age = Dt.monthsBetween(child.birthDate, rec.date).toDouble()
                        val p = GrowthStandards.percentile(child.gender, metric, age, value)
                        val z = GrowthStandards.zScore(child.gender, metric, age, value)
                        val median = GrowthStandards.median(child.gender, metric, age)
                        Text("%.0f 백분위".format(p), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
                        ProgressBar((p / 100).toFloat())
                        Text("측정값 $value${metric.unit} · 또래 평균 %.1f${metric.unit} · z=%.2f".format(median, z), style = MaterialTheme.typography.bodySmall)
                        Text(GrowthStandards.describe(p), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            SectionCard(title = "성장 팁", emoji = "💡") {
                BulletList(listOf(
                    "백분위가 낮거나 높아도 '일정한 곡선을 따라 크는지'가 더 중요해요.",
                    "같은 시간대, 같은 도구로 측정하면 변화를 정확히 볼 수 있어요.",
                    "갑자기 곡선을 가로질러 떨어지면 소아과에 상담하세요."
                ))
            }
        }
    }
}

// ═══════════════════════ 예방접종 ═══════════════════════

class VaccineViewModel(app: Application) : BaseViewModel(app) {
    val records: StateFlow<List<VaccineRecord>> = forChild(emptyList()) { db.vaccineDao().observe(it) }
    fun mark(childId: Long, key: String, date: Long, hospital: String) =
        io { db.vaccineDao().upsert(VaccineRecord(childId = childId, doseKey = key, doneDate = date, hospital = hospital)) }
    fun unmark(childId: Long, key: String) = io { db.vaccineDao().deleteByKey(childId, key) }
}

@Composable
fun VaccineScreen(nav: NavController, vm: VaccineViewModel = viewModel()) {
    val records by vm.records.collectAsState()
    var target by remember { mutableStateOf<Triple<String, String, Int>?>(null) }

    ChildScaffold("예방접종", nav) { child, padding ->
        val done = records.associateBy { it.doseKey }
        val months = Dt.monthsBetween(child.birthDate)
        val due = VaccineContent.dueNow(months, done.keys)
        val overdue = VaccineContent.overdue(months, done.keys)
        val total = VaccineContent.totalDoses()

        ListScreen(padding) {
            item {
                SectionCard(title = "접종 현황", emoji = "💉") {
                    Text("${done.size} / $total 회 완료", style = MaterialTheme.typography.titleMedium)
                    ProgressBar(done.size.toFloat() / total)
                    if (overdue.isNotEmpty()) Text("권장 시기가 지난 접종 ${overdue.size}건", color = MaterialTheme.colorScheme.error)
                    if (due.isNotEmpty()) Text("지금 맞을 수 있는 접종 ${due.size}건", color = MaterialTheme.colorScheme.primary)
                }
            }
            if (due.isNotEmpty()) {
                item { SectionHeader("지금 접종 가능") }
                items(due) { (v, i) ->
                    ItemCard("🟢", "${v.name} ${v.doses[i].label}", "권장 ${v.doses[i].fromMonth}~${v.doses[i].toMonth}개월",
                        onClick = { target = Triple(v.doseKey(i), "${v.name} ${v.doses[i].label}", 0) })
                }
            }
            item { SectionHeader("전체 일정") }
            items(VaccineContent.all, key = { it.code }) { v ->
                SectionCard(title = v.name, emoji = if (v.national) "🇰🇷" else "💰") {
                    Text("${v.disease} · ${v.note}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    v.doses.forEachIndexed { i, d ->
                        val rec = done[v.doseKey(i)]
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = rec != null,
                                onCheckedChange = {
                                    if (rec != null) vm.unmark(child.id, v.doseKey(i))
                                    else target = Triple(v.doseKey(i), "${v.name} ${d.label}", 0)
                                }
                            )
                            Text("${d.label}  (${d.fromMonth}~${d.toMonth}개월)", Modifier.weight(1f))
                            if (rec != null) Pill(Dt.date(rec.doneDate), Mint)
                        }
                    }
                }
            }
            item { SectionCard(title = "접종 전후 체크", emoji = "✅") { BulletList(VaccineContent.checklist) } }
        }

        target?.let { (key, name, _) ->
            var date by remember(key) { mutableStateOf(Dt.todayStart()) }
            var hospital by remember(key) { mutableStateOf("") }
            FormDialog("접종 완료 기록", { target = null }, onConfirm = {
                vm.mark(child.id, key, date, hospital.trim()); target = null
            }) {
                Text(name, style = MaterialTheme.typography.titleMedium)
                DateField("접종일", date, { date = it })
                AppTextField(hospital, { hospital = it }, "병원 (선택)")
            }
        }
    }
}

// ═══════════════════════ 체온·증상 ═══════════════════════

class HealthViewModel(app: Application) : BaseViewModel(app) {
    val logs: StateFlow<List<HealthLog>> = forChild(emptyList()) { db.healthDao().observeRecent(it, 200) }
    fun save(l: HealthLog) = io { db.healthDao().upsert(l) }
    fun delete(l: HealthLog) = io { db.healthDao().delete(l) }
}

@Composable
fun HealthScreen(nav: NavController, vm: HealthViewModel = viewModel()) {
    val logs by vm.logs.collectAsState()
    var dialog by remember { mutableStateOf<HealthLog?>(null) }
    val askDelete = rememberDeleteTarget<HealthLog>({ vm.delete(it) })

    ChildScaffold("체온·증상", nav, fabLabel = "기록 추가", onFab = { c ->
        dialog = HealthLog(childId = c.id, time = Dt.now())
    }) { child, padding ->
        val months = Dt.monthsBetween(child.birthDate)
        val temps = logs.filter { it.tempC != null }.take(14).reversed()
        val last = logs.firstOrNull { it.tempC != null }
        ListScreen(padding) {
            last?.let { l ->
                item {
                    InfoBanner(
                        "${l.tempC}℃ (${Dt.relative(l.time)}) — " + SymptomContent.tempAdvice(l.tempC!!, months),
                        "🌡️", warn = (l.tempC ?: 0.0) >= 38.0
                    )
                }
            }
            if (temps.size >= 2) {
                item {
                    SectionCard(title = "최근 체온", emoji = "📈") {
                        LineChart(
                            listOf(ChartSeries("체온", temps.mapIndexed { i, l -> i.toFloat() to l.tempC!!.toFloat() }, Rose)),
                            xLabel = { "" }, yLabel = { "%.1f".format(it) }, height = 180
                        )
                    }
                }
            }
            if (logs.isEmpty()) item { EmptyState("🌡️", "건강 기록이 없어요") }
            items(logs, key = { it.id }) { l ->
                ItemCard(
                    emoji = if ((l.tempC ?: 0.0) >= 38.0) "🤒" else "🌡️",
                    title = l.tempC?.let { "$it℃" } ?: "증상 기록",
                    subtitle = Dt.dateTime(l.time),
                    detail = listOf(l.symptoms, l.memo).filter { it.isNotBlank() }.joinToString(" · "),
                    onClick = { dialog = l },
                    trailing = { DeleteButton { askDelete(l) } }
                )
            }
        }
    }

    dialog?.let { l ->
        var time by remember(l) { mutableStateOf(l.time) }
        var temp by remember(l) { mutableStateOf(l.tempC?.toString() ?: "") }
        var symptoms by remember(l) { mutableStateOf(l.symptoms.split(",").filter { it.isNotBlank() }.toSet()) }
        var memo by remember(l) { mutableStateOf(l.memo) }
        FormDialog("건강 기록", { dialog = null },
            confirmEnabled = temp.isNotBlank() || symptoms.isNotEmpty(),
            onConfirm = {
                vm.save(l.copy(time = time, tempC = temp.toDoubleOrNull(), symptoms = symptoms.joinToString(","), memo = memo.trim()))
                dialog = null
            }) {
            DateTimeFields(time) { time = it }
            NumberField(temp, { temp = it }, "체온", "℃")
            Text("증상 (여러 개 선택)", style = MaterialTheme.typography.bodySmall)
            androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                SymptomContent.common.forEach { s ->
                    androidx.compose.material3.FilterChip(
                        selected = s in symptoms,
                        onClick = { symptoms = if (s in symptoms) symptoms - s else symptoms + s },
                        label = { Text(s) }
                    )
                }
            }
            AppTextField(memo, { memo = it }, "메모")
        }
    }
}

// ═══════════════════════ 투약 ═══════════════════════

class MedicationViewModel(app: Application) : BaseViewModel(app) {
    val meds: StateFlow<List<Medication>> = forChild(emptyList()) { db.medicationDao().observe(it) }
    val todayLogs: StateFlow<List<MedicationLog>> =
        forChild(emptyList()) { db.medicationDao().observeLogs(it, Dt.todayStart(), Dt.todayStart() + Dt.DAY_MS) }

    fun save(m: Medication, childName: String) = io {
        val id = db.medicationDao().upsert(m)
        val saved = if (m.id == 0L) m.copy(id = id) else m
        val times = saved.times.split(",")
        // 기존 알림 취소 후 재등록
        for (i in 0 until 8) Reminders.cancel(context, Reminders.medKey(saved.id, i))
        if (saved.active && saved.remind) {
            val until = saved.endDate?.let { Dt.endOfDay(it) } ?: 0L
            times.forEachIndexed { i, t ->
                Dt.parseHm(t)?.let { (h, mi) ->
                    Reminders.scheduleDaily(context, Reminders.medKey(saved.id, i),
                        "💊 $childName ${saved.name} 먹일 시간이에요", saved.dose.ifBlank { "복용 시간입니다" }, h, mi, until, "medication")
                }
            }
        }
    }

    fun delete(m: Medication) = io {
        for (i in 0 until 8) Reminders.cancel(context, Reminders.medKey(m.id, i))
        db.medicationDao().delete(m)
    }

    fun give(m: Medication) = io {
        db.medicationDao().insertLog(MedicationLog(medicationId = m.id, childId = m.childId, time = Dt.now()))
    }

    fun undo(l: MedicationLog) = io { db.medicationDao().deleteLog(l) }
}

@Composable
fun MedicationScreen(nav: NavController, vm: MedicationViewModel = viewModel()) {
    val meds by vm.meds.collectAsState()
    val todayLogs by vm.todayLogs.collectAsState()
    var dialog by remember { mutableStateOf<Medication?>(null) }
    val askDelete = rememberDeleteTarget<Medication>({ vm.delete(it) }, "약 정보를 삭제할까요?", "복용 기록과 알림도 함께 삭제돼요.")

    ChildScaffold("투약 관리", nav, fabLabel = "약 추가", onFab = { c ->
        dialog = Medication(childId = c.id, name = "", startDate = Dt.todayStart())
    }) { child, padding ->
        ListScreen(padding) {
            item { InfoBanner("해열제 등은 반드시 체중에 맞는 용량과 최소 간격을 지켜주세요. 마지막 복용 시각을 꼭 확인하세요.", "⚠️", true) }
            if (meds.isEmpty()) item { EmptyState("💊", "등록된 약이 없어요") }
            items(meds, key = { it.id }) { m ->
                val logs = todayLogs.filter { it.medicationId == m.id }
                SectionCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        androidx.compose.foundation.layout.Column(Modifier.weight(1f)) {
                            Text("💊 ${m.name}", style = MaterialTheme.typography.titleMedium)
                            Text("${m.dose} · 하루 ${m.times.split(",").size}회 (${m.times})", style = MaterialTheme.typography.bodySmall)
                            Text(
                                "${Dt.date(m.startDate)} ~ ${m.endDate?.let { Dt.date(it) } ?: "계속"}",
                                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (!m.active) Pill("종료")
                        DeleteButton { askDelete(m) }
                    }
                    Text(
                        if (logs.isEmpty()) "오늘 복용 기록 없음" else "오늘 ${logs.size}회 복용 (마지막 ${Dt.time(logs.maxOf { it.time })})",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { vm.give(m) }) { Text("먹였어요 ✔") }
                        if (logs.isNotEmpty()) OutlinedButton(onClick = { vm.undo(logs.first()) }) { Text("방금 기록 취소") }
                        OutlinedButton(onClick = { dialog = m }) { Text("수정") }
                    }
                }
            }
        }
        dialog?.let { m ->
            var name by remember(m) { mutableStateOf(m.name) }
            var dose by remember(m) { mutableStateOf(m.dose) }
            var times by remember(m) { mutableStateOf(m.times) }
            var start by remember(m) { mutableStateOf(m.startDate) }
            var hasEnd by remember(m) { mutableStateOf(m.endDate != null) }
            var end by remember(m) { mutableStateOf(m.endDate ?: (Dt.todayStart() + 5 * Dt.DAY_MS)) }
            var remind by remember(m) { mutableStateOf(m.remind) }
            var active by remember(m) { mutableStateOf(m.active) }
            val timesValid = times.split(",").all { Dt.parseHm(it) != null }
            FormDialog("약 정보", { dialog = null }, confirmEnabled = name.isNotBlank() && timesValid, onConfirm = {
                vm.save(m.copy(name = name.trim(), dose = dose.trim(), times = times.replace(" ", ""),
                    startDate = start, endDate = if (hasEnd) end else null, remind = remind, active = active), child.name)
                dialog = null
            }) {
                AppTextField(name, { name = it }, "약 이름")
                AppTextField(dose, { dose = it }, "용량 (예: 5ml, 1포)")
                AppTextField(times, { times = it }, "복용 시각 (예: 08:00,20:00)")
                if (!timesValid) Text("시각은 HH:MM 형식으로 쉼표로 구분해주세요", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                DateField("시작일", start, { start = it })
                SwitchRow("종료일 지정", hasEnd, { hasEnd = it })
                if (hasEnd) DateField("종료일", end, { end = it })
                SwitchRow("복용 알림", remind, { remind = it })
                SwitchRow("복용 중", active, { active = it })
            }
        }
    }
}

// ═══════════════════════ 병원 예약 ═══════════════════════

class AppointmentViewModel(app: Application) : BaseViewModel(app) {
    val items: StateFlow<List<Appointment>> = db.appointmentDao().observeAll().asState(emptyList())

    fun save(a: Appointment) = io {
        val id = db.appointmentDao().upsert(a)
        val key = Reminders.apptKey(if (a.id == 0L) id else a.id)
        Reminders.cancel(context, key)
        if (!a.done && a.remindMinutes > 0) {
            Reminders.scheduleOnce(context, key, "🏥 ${a.title}", "${a.hospital} ${Dt.time(a.time)} 진료 예정", a.time - a.remindMinutes * 60_000L, "appointment")
        }
    }

    fun delete(a: Appointment) = io {
        Reminders.cancel(context, Reminders.apptKey(a.id)); db.appointmentDao().delete(a)
    }
}

@Composable
fun AppointmentScreen(nav: NavController, vm: AppointmentViewModel = viewModel()) {
    val items by vm.items.collectAsState()
    val children = com.momcare.app.ui.components.LocalChildren.current
    var dialog by remember { mutableStateOf<Appointment?>(null) }
    val askDelete = rememberDeleteTarget<Appointment>({ vm.delete(it) })

    MomScaffold("병원 예약", nav, fabLabel = "예약 추가", onFab = {
        dialog = Appointment(title = "", time = Dt.atTime(Dt.now() + Dt.DAY_MS, 10, 0))
    }) { padding ->
        ListScreen(padding) {
            if (items.isEmpty()) item { EmptyState("🏥", "예약된 진료가 없어요", "예약을 등록하면 알림으로 알려드려요.") }
            items(items, key = { it.id }) { a ->
                val who = children.firstOrNull { it.id == a.childId }?.name
                ItemCard(
                    emoji = if (a.done) "✅" else "🏥", title = a.title,
                    subtitle = Dt.dateTime(a.time) + (who?.let { " · $it" } ?: ""),
                    detail = listOf(a.hospital, a.department, a.memo).filter { it.isNotBlank() }.joinToString(" · "),
                    onClick = { dialog = a },
                    trailing = {
                        Row {
                            Checkbox(a.done, { vm.save(a.copy(done = it)) })
                            DeleteButton { askDelete(a) }
                        }
                    }
                )
            }
        }
    }

    dialog?.let { a ->
        var title by remember(a) { mutableStateOf(a.title) }
        var hospital by remember(a) { mutableStateOf(a.hospital) }
        var dept by remember(a) { mutableStateOf(a.department) }
        var time by remember(a) { mutableStateOf(a.time) }
        var childId by remember(a) { mutableStateOf(a.childId) }
        var remind by remember(a) { mutableStateOf(a.remindMinutes) }
        var memo by remember(a) { mutableStateOf(a.memo) }
        FormDialog("진료 예약", { dialog = null }, confirmEnabled = title.isNotBlank(), onConfirm = {
            vm.save(a.copy(title = title.trim(), hospital = hospital.trim(), department = dept.trim(), time = time,
                childId = childId, remindMinutes = remind, memo = memo.trim()))
            dialog = null
        }) {
            AppTextField(title, { title = it }, "진료 내용 (예: 영유아 검진)")
            AppTextField(hospital, { hospital = it }, "병원")
            AppTextField(dept, { dept = it }, "진료과")
            DateTimeFields(time) { time = it }
            if (children.isNotEmpty()) {
                Text("대상", style = MaterialTheme.typography.bodySmall)
                ChipSelector(listOf<Long?>(null) + children.map { it.id }, childId,
                    { id -> children.firstOrNull { it.id == id }?.name ?: "가족 전체" }, { childId = it })
            }
            Text("알림", style = MaterialTheme.typography.bodySmall)
            ChipSelector(listOf(0, 30, 60, 180, 1440), remind,
                { if (it == 0) "없음" else if (it < 60) "${it}분 전" else if (it < 1440) "${it / 60}시간 전" else "하루 전" }, { remind = it })
            AppTextField(memo, { memo = it }, "질문 메모 (진료 때 물어볼 것)", singleLine = false, minLines = 2)
        }
    }
}

// ═══════════════════════ 알레르기 ═══════════════════════

class AllergyViewModel(app: Application) : BaseViewModel(app) {
    val items: StateFlow<List<Allergy>> = forChild(emptyList()) { db.allergyDao().observe(it) }
    fun save(a: Allergy) = io { db.allergyDao().upsert(a) }
    fun delete(a: Allergy) = io { db.allergyDao().delete(a) }
}

@Composable
fun AllergyScreen(nav: NavController, vm: AllergyViewModel = viewModel()) {
    val items by vm.items.collectAsState()
    var dialog by remember { mutableStateOf<Allergy?>(null) }
    val askDelete = rememberDeleteTarget<Allergy>({ vm.delete(it) })

    ChildScaffold("알레르기", nav, fabLabel = "추가", onFab = { c ->
        dialog = Allergy(childId = c.id, allergen = "")
    }) { child, padding ->
        val sorted = items.sortedByDescending { it.severity.ordinal }
        ListScreen(padding) {
            if (sorted.any { it.severity == Severity.SEVERE }) {
                item { InfoBanner("심각한 알레르기가 있어요. 어린이집·학교·가족에게 꼭 공유하고 응급 대처법을 확인하세요.", "🚨", true) }
            }
            if (sorted.isEmpty()) item { EmptyState("🥜", "등록된 알레르기가 없어요", "의심되는 음식이나 물질을 기록해두세요.") }
            items(sorted, key = { it.id }) { a ->
                ItemCard(
                    emoji = a.severity.emoji, title = a.allergen,
                    subtitle = "${a.severity.label}" + (a.discoveredDate?.let { " · ${Dt.date(it)} 확인" } ?: ""),
                    detail = listOf(a.reaction, a.memo).filter { it.isNotBlank() }.joinToString(" · "),
                    onClick = { dialog = a },
                    trailing = { DeleteButton { askDelete(a) } }
                )
            }
        }
    }

    dialog?.let { a ->
        var name by remember(a) { mutableStateOf(a.allergen) }
        var sev by remember(a) { mutableStateOf(a.severity) }
        var reaction by remember(a) { mutableStateOf(a.reaction) }
        var date by remember(a) { mutableStateOf(a.discoveredDate ?: Dt.todayStart()) }
        var memo by remember(a) { mutableStateOf(a.memo) }
        FormDialog("알레르기", { dialog = null }, confirmEnabled = name.isNotBlank(), onConfirm = {
            vm.save(a.copy(allergen = name.trim(), severity = sev, reaction = reaction.trim(), discoveredDate = date, memo = memo.trim()))
            dialog = null
        }) {
            AppTextField(name, { name = it }, "원인 (예: 달걀, 땅콩)")
            ChipSelector(com.momcare.app.content.SolidContent.commonAllergens, null, { it }, { name = it })
            ChipSelector(Severity.entries, sev, { "${it.emoji} ${it.label}" }, { sev = it })
            AppTextField(reaction, { reaction = it }, "증상 (예: 두드러기, 구토)")
            DateField("처음 확인한 날", date, { date = it })
            AppTextField(memo, { memo = it }, "메모")
        }
    }
}

// ═══════════════════════ 발달 체크 ═══════════════════════

class MilestoneViewModel(app: Application) : BaseViewModel(app) {
    val records: StateFlow<List<MilestoneRecord>> = forChild(emptyList()) { db.milestoneDao().observe(it) }
    fun toggle(childId: Long, key: String, checked: Boolean) = io {
        if (checked) db.milestoneDao().upsert(MilestoneRecord(childId = childId, milestoneKey = key, achievedDate = Dt.now()))
        else db.milestoneDao().deleteByKey(childId, key)
    }
}

@Composable
fun MilestoneScreen(nav: NavController, vm: MilestoneViewModel = viewModel()) {
    val records by vm.records.collectAsState()
    ChildScaffold("발달 체크", nav) { child, padding ->
        val months = Dt.monthsBetween(child.birthDate)
        var band by remember(child.id) { mutableStateOf(MilestoneContent.currentBand(months)) }
        val doneKeys = records.map { it.milestoneKey }.toSet()
        val list = MilestoneContent.forBand(band)

        ListScreen(padding) {
            item {
                SectionCard(title = "${child.name}의 발달 · ${Dt.ageText(child.birthDate)}", emoji = "🌱") {
                    val bandDone = list.count { it.key in doneKeys }
                    Text("${MilestoneContent.bandLabel(band)} 구간 $bandDone/${list.size} 달성", style = MaterialTheme.typography.bodyLarge)
                    ProgressBar(if (list.isEmpty()) 0f else bandDone.toFloat() / list.size)
                }
            }
            item { ChipSelector(MilestoneContent.bands, band, { MilestoneContent.bandLabel(it) }, { band = it }) }
            MilestoneDomain.entries.forEach { d ->
                val inDomain = list.filter { it.domain == d }
                if (inDomain.isNotEmpty()) {
                    item { SectionHeader("${d.emoji} ${d.label}") }
                    items(inDomain, key = { it.key }) { m ->
                        val rec = records.firstOrNull { it.milestoneKey == m.key }
                        ItemCard(
                            emoji = if (rec != null) "✅" else "⬜", title = m.text,
                            subtitle = rec?.let { "${Dt.date(it.achievedDate)} 달성 (${Dt.ageText(child.birthDate, it.achievedDate)})" } ?: "아직이에요",
                            onClick = { vm.toggle(child.id, m.key, rec == null) }
                        )
                    }
                }
            }
            item {
                SectionCard(title = "이럴 땐 소아과 상담을 권해요", emoji = "⚠️") {
                    BulletList(MilestoneContent.redFlags)
                    Text("아이마다 속도가 달라요. 체크리스트는 참고용이에요.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
