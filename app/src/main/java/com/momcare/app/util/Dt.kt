package com.momcare.app.util

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

/** 날짜/시간 유틸. 앱 전체에서 epoch millis(Long)를 기본 단위로 사용한다. */
object Dt {
    val zone: ZoneId get() = ZoneId.systemDefault()
    private val KO = Locale.KOREAN

    private val fDate = DateTimeFormatter.ofPattern("yyyy.MM.dd", KO)
    private val fDateWeek = DateTimeFormatter.ofPattern("M월 d일 (E)", KO)
    private val fDateLong = DateTimeFormatter.ofPattern("yyyy년 M월 d일 (E)", KO)
    private val fTime = DateTimeFormatter.ofPattern("a h:mm", KO)
    private val fTime24 = DateTimeFormatter.ofPattern("HH:mm", KO)
    private val fMonth = DateTimeFormatter.ofPattern("yyyy년 M월", KO)
    private val fShort = DateTimeFormatter.ofPattern("M/d", KO)

    fun now(): Long = System.currentTimeMillis()

    fun toDate(ms: Long): LocalDate = Instant.ofEpochMilli(ms).atZone(zone).toLocalDate()
    fun toDateTime(ms: Long): LocalDateTime = Instant.ofEpochMilli(ms).atZone(zone).toLocalDateTime()
    fun today(): LocalDate = LocalDate.now(zone)

    fun startOfDay(ms: Long): Long = toDate(ms).atStartOfDay(zone).toInstant().toEpochMilli()
    fun endOfDay(ms: Long): Long = startOfDay(ms) + DAY_MS
    fun startOfDay(date: LocalDate): Long = date.atStartOfDay(zone).toInstant().toEpochMilli()
    fun todayStart(): Long = startOfDay(today())

    /** 로컬 날짜의 일련번호 (일별 레코드의 키로 사용) */
    fun dayEpoch(ms: Long = now()): Long = toDate(ms).toEpochDay()
    fun fromDayEpoch(day: Long): Long = startOfDay(LocalDate.ofEpochDay(day))

    fun atTime(dayMs: Long, hour: Int, minute: Int): Long =
        toDate(dayMs).atTime(hour, minute).atZone(zone).toInstant().toEpochMilli()

    /** [dateMs] 의 날짜에 [timeMs] 의 시각을 합친다 */
    fun combine(dateMs: Long, timeMs: Long): Long {
        val t = toDateTime(timeMs)
        return atTime(dateMs, t.hour, t.minute)
    }

    fun hour(ms: Long) = toDateTime(ms).hour
    fun minute(ms: Long) = toDateTime(ms).minute

    /** DatePicker 는 UTC 자정 millis 를 주므로 로컬 날짜 자정으로 변환 */
    fun fromPickerUtc(utcMs: Long): Long {
        val d = Instant.ofEpochMilli(utcMs).atZone(ZoneOffset.UTC).toLocalDate()
        return startOfDay(d)
    }

    fun toPickerUtc(ms: Long): Long =
        toDate(ms).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

    fun date(ms: Long): String = fDate.format(toDate(ms))
    fun dateWeek(ms: Long): String = fDateWeek.format(toDate(ms))
    fun dateLong(ms: Long): String = fDateLong.format(toDate(ms))
    fun time(ms: Long): String = fTime.format(toDateTime(ms))
    fun time24(ms: Long): String = fTime24.format(toDateTime(ms))
    fun dateTime(ms: Long): String = "${dateWeek(ms)} ${time(ms)}"
    fun month(date: LocalDate): String = fMonth.format(date)
    fun short(ms: Long): String = fShort.format(toDate(ms))

    fun hm(hour: Int, minute: Int): String = "%02d:%02d".format(hour, minute)

    fun parseHm(text: String): Pair<Int, Int>? {
        val p = text.trim().split(":")
        if (p.size != 2) return null
        val h = p[0].toIntOrNull() ?: return null
        val m = p[1].toIntOrNull() ?: return null
        if (h !in 0..23 || m !in 0..59) return null
        return h to m
    }

    fun dayName(dow: Int): String =
        DayOfWeek.of(dow).getDisplayName(TextStyle.SHORT, KO)

    // ── 나이 ──

    fun monthsBetween(birthMs: Long, atMs: Long = now()): Int =
        ChronoUnit.MONTHS.between(toDate(birthMs), toDate(atMs)).toInt().coerceAtLeast(0)

    fun daysBetween(fromMs: Long, toMs: Long): Long =
        ChronoUnit.DAYS.between(toDate(fromMs), toDate(toMs))

    fun daysSinceBirth(birthMs: Long): Long = daysBetween(birthMs, now()) + 1

    /** "생후 3개월 12일" / "만 2세 3개월" */
    fun ageText(birthMs: Long, atMs: Long = now()): String {
        val b = toDate(birthMs)
        val a = toDate(atMs)
        if (a.isBefore(b)) return "출산 예정 D-${ChronoUnit.DAYS.between(a, b)}"
        val totalMonths = ChronoUnit.MONTHS.between(b, a).toInt()
        val years = totalMonths / 12
        val months = totalMonths % 12
        return when {
            totalMonths < 1 -> "생후 ${ChronoUnit.DAYS.between(b, a)}일"
            totalMonths < 24 -> {
                val days = ChronoUnit.DAYS.between(b.plusMonths(totalMonths.toLong()), a)
                "생후 ${totalMonths}개월 ${days}일"
            }
            months == 0 -> "만 ${years}세"
            else -> "만 ${years}세 ${months}개월"
        }
    }

    fun ageShort(birthMs: Long): String {
        val m = monthsBetween(birthMs)
        return if (m < 24) "${m}개월" else "만 ${m / 12}세"
    }

    fun addMonths(ms: Long, months: Int): Long =
        startOfDay(toDate(ms).plusMonths(months.toLong()))

    /** 목표 날짜까지 D-day (오늘이면 0, 지났으면 음수) */
    fun dDay(targetMs: Long): Int = ChronoUnit.DAYS.between(today(), toDate(targetMs)).toInt()

    fun dDayText(days: Int): String = when {
        days == 0 -> "D-DAY"
        days > 0 -> "D-$days"
        else -> "D+${-days}"
    }

    /** 매년 반복되는 기념일의 다음 날짜 */
    fun nextYearly(dateMs: Long): Long {
        val base = toDate(dateMs)
        val t = today()
        var next = runCatching { base.withYear(t.year) }.getOrElse { LocalDate.of(t.year, 2, 28) }
        if (next.isBefore(t)) {
            next = runCatching { base.withYear(t.year + 1) }.getOrElse { LocalDate.of(t.year + 1, 2, 28) }
        }
        return startOfDay(next)
    }

    // ── 경과 시간 ──

    fun relative(ms: Long): String {
        val diff = now() - ms
        val min = diff / 60_000
        return when {
            diff < 0 -> "곧"
            min < 1 -> "방금 전"
            min < 60 -> "${min}분 전"
            min < 60 * 24 -> "${min / 60}시간 ${min % 60}분 전"
            else -> "${min / (60 * 24)}일 전"
        }
    }

    fun durationText(ms: Long): String {
        val totalMin = (ms / 60_000).coerceAtLeast(0)
        val h = totalMin / 60
        val m = totalMin % 60
        return when {
            h == 0L -> "${m}분"
            m == 0L -> "${h}시간"
            else -> "${h}시간 ${m}분"
        }
    }

    fun elapsedClock(ms: Long): String {
        val s = (ms / 1000).coerceAtLeast(0)
        return "%02d:%02d:%02d".format(s / 3600, (s % 3600) / 60, s % 60)
    }

    /** 이번 달의 첫날 / 다음 달 첫날 */
    fun monthStart(date: LocalDate): Long = startOfDay(date.withDayOfMonth(1))
    fun nextMonthStart(date: LocalDate): Long = startOfDay(date.withDayOfMonth(1).plusMonths(1))

    fun nextOccurrence(hour: Int, minute: Int, daysMask: Int, fromMs: Long = now()): Long? {
        if (daysMask and 127 == 0) return null
        val from = toDateTime(fromMs)
        for (offset in 0..7) {
            val d = from.toLocalDate().plusDays(offset.toLong())
            val dt = LocalDateTime.of(d, LocalTime.of(hour, minute))
            val bit = 1 shl (d.dayOfWeek.value - 1)
            if (daysMask and bit != 0 && dt.isAfter(from)) {
                return dt.atZone(zone).toInstant().toEpochMilli()
            }
        }
        return null
    }

    const val DAY_MS = 24L * 60 * 60 * 1000
}
