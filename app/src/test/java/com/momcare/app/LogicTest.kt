package com.momcare.app

import com.momcare.app.content.ChecklistTemplates
import com.momcare.app.content.CounselContent
import com.momcare.app.content.EpdsContent
import com.momcare.app.content.GrowthMetric
import com.momcare.app.content.GrowthStandards
import com.momcare.app.content.MilestoneContent
import com.momcare.app.content.PregnancyContent
import com.momcare.app.content.RecipeContent
import com.momcare.app.content.SymptomContent
import com.momcare.app.content.VaccineContent
import com.momcare.app.data.AppLock
import com.momcare.app.data.Gender
import com.momcare.app.ui.nav.Features
import com.momcare.app.ui.nav.Privacy
import com.momcare.app.ui.nav.Routes
import com.momcare.app.ui.nav.Visibility
import com.momcare.app.util.Dt
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime

/** UI 를 제외한 핵심 로직 테스트 (JVM 단위 테스트) */
class AppLockTest {
    @Test fun wrongPasswordsRejected() {
        listOf("", " ", "1234", "password", "momcare", "0000000000").forEach {
            assertFalse("'$it' 은 거부되어야 함", AppLock.verify(it))
        }
    }

    /**
     * 실제 가족 비밀번호는 저장소에 두지 않는다.
     * 확인하고 싶을 때만 환경 변수 MOMCARE_LOCK_PW 로 전달해 실행한다.
     */
    @Test fun familyPasswordAccepted() {
        val pw = System.getenv("MOMCARE_LOCK_PW")
        Assume.assumeTrue("MOMCARE_LOCK_PW 가 없으면 건너뜀", !pw.isNullOrEmpty())
        assertTrue(AppLock.verify(pw!!))
        assertTrue("앞뒤 공백은 무시", AppLock.verify("  $pw "))
        assertFalse("대소문자는 구분", AppLock.verify(pw.uppercase().takeIf { it != pw } ?: (pw + "x")))
    }
}

class DtTest {
    private fun ms(y: Int, m: Int, d: Int, h: Int = 0, min: Int = 0) =
        LocalDateTime.of(y, m, d, h, min).atZone(Dt.zone).toInstant().toEpochMilli()

    @Test fun ageText() {
        val birth = ms(2025, 1, 10)
        assertEquals("생후 5일", Dt.ageText(birth, ms(2025, 1, 15)))
        assertEquals("생후 3개월 5일", Dt.ageText(birth, ms(2025, 4, 15)))
        assertEquals("만 2세", Dt.ageText(birth, ms(2027, 1, 20)))
        assertEquals("만 3세 2개월", Dt.ageText(birth, ms(2028, 3, 11)))
        assertTrue(Dt.ageText(ms(2030, 1, 1), ms(2029, 12, 1)).startsWith("출산 예정"))
    }

    @Test fun parseHm() {
        assertEquals(8 to 30, Dt.parseHm("08:30"))
        assertEquals(23 to 5, Dt.parseHm(" 23:05 "))
        assertNull(Dt.parseHm("24:00"))
        assertNull(Dt.parseHm("8시"))
        assertNull(Dt.parseHm("12:60"))
    }

    @Test fun nextOccurrenceRespectsDays() {
        // 2026-11-02 은 월요일
        val mondayNoon = ms(2026, 11, 2, 12, 0)
        assertEquals(DayOfWeek.MONDAY, Dt.toDate(mondayNoon).dayOfWeek)
        // 매일 21:30 → 같은 날 21:30
        assertEquals(ms(2026, 11, 2, 21, 30), Dt.nextOccurrence(21, 30, 127, mondayNoon))
        // 매일 08:00 → 이미 지났으므로 다음 날
        assertEquals(ms(2026, 11, 3, 8, 0), Dt.nextOccurrence(8, 0, 127, mondayNoon))
        // 주말(토=32, 일=64)만 → 토요일
        assertEquals(ms(2026, 11, 7, 9, 0), Dt.nextOccurrence(9, 0, 96, mondayNoon))
        // 요일 없음 → null
        assertNull(Dt.nextOccurrence(9, 0, 0, mondayNoon))
        // 월요일만, 이미 지난 시각 → 다음 주 월요일
        assertEquals(ms(2026, 11, 9, 7, 0), Dt.nextOccurrence(7, 0, 1, mondayNoon))
    }

    @Test fun dDayText() {
        assertEquals("D-DAY", Dt.dDayText(0))
        assertEquals("D-3", Dt.dDayText(3))
        assertEquals("D+2", Dt.dDayText(-2))
    }

    @Test fun nextYearlyIsNeverPast() {
        val next = Dt.nextYearly(ms(2020, 2, 29))
        assertFalse(Dt.toDate(next).isBefore(Dt.today()))
        val birthday = Dt.nextYearly(ms(2019, 1, 1))
        assertTrue(Dt.dDay(birthday) in 0..366)
    }

    @Test fun dayEpochRoundTrip() {
        val day = LocalDate.of(2026, 5, 5).toEpochDay()
        assertEquals(LocalDate.of(2026, 5, 5), Dt.toDate(Dt.fromDayEpoch(day)))
    }

    @Test fun durationText() {
        assertEquals("5분", Dt.durationText(5 * 60_000L))
        assertEquals("2시간", Dt.durationText(120 * 60_000L))
        assertEquals("1시간 30분", Dt.durationText(90 * 60_000L))
        assertEquals("0분", Dt.durationText(-1000))
    }
}

class CounselContentTest {
    @Test fun skillsAreComplete() {
        val all = CounselContent.all
        assertEquals(27, all.size)
        assertEquals("스킬 id 중복 없음", all.size, all.map { it.id }.toSet().size)
        val cats = CounselContent.categories.map { it.id }.toSet()
        all.forEach { s ->
            assertTrue("${s.id} 분야", s.category in cats)
            assertTrue("${s.id} 단계", s.steps.size >= 2)
            assertTrue("${s.id} 말하기", s.sayThis.isNotEmpty())
            assertTrue("${s.id} 피하기", s.avoid.isNotEmpty())
            assertTrue("${s.id} 미션", s.practice.isNotBlank())
            assertTrue(s.level in 1..3)
        }
        CounselContent.categories.forEach { c -> assertTrue("${c.id} 에 스킬 존재", CounselContent.skillsIn(c.id).isNotEmpty()) }
    }

    @Test fun referencesResolve() {
        CounselContent.starterPath.forEach { assertNotNull(it, CounselContent.skillById(it)) }
        CounselContent.quickPhrases.forEach { assertNotNull(it.skillId, CounselContent.skillById(it.skillId)) }
    }

    @Test fun dailySkillIsDeterministicAndRotates() {
        val a = CounselContent.dailySkill(20000)
        assertEquals(a, CounselContent.dailySkill(20000))
        val week = (20000L until 20007L).map { CounselContent.dailySkill(it).id }.toSet()
        assertEquals("일주일 동안 매일 다른 스킬", 7, week.size)
        assertEquals("SELF", CounselContent.dailySkill(20000, "SELF").category)
        // 알람마다 다른 스킬이 나오도록 salt 적용
        assertFalse(CounselContent.dailySkill(20000, "", 1) == CounselContent.dailySkill(20000, "", 0))
        // 음수 salt 에도 안전
        assertNotNull(CounselContent.dailySkill(0, "", -5))
    }
}

class HealthContentTest {
    @Test fun vaccineScheduleConsistent() {
        val keys = VaccineContent.all.flatMap { v -> v.doses.indices.map { v.doseKey(it) } }
        assertEquals(keys.size, keys.toSet().size)
        VaccineContent.all.forEach { v -> v.doses.forEach { d -> assertTrue("${v.code} ${d.label}", d.fromMonth <= d.toMonth) } }
        val dueAt2 = VaccineContent.dueNow(2, emptySet()).map { (v, i) -> v.doseKey(i) }
        assertTrue("DTAP#0" in dueAt2)
        assertTrue("PCV#0" in dueAt2)
        val doneDtap = VaccineContent.dueNow(2, setOf("DTAP#0")).map { (v, i) -> v.doseKey(i) }
        assertFalse("DTAP#0" in doneDtap)
        val overdue = VaccineContent.overdue(10, emptySet()).map { (v, _) -> v.code }
        assertTrue("BCG" in overdue)
        assertFalse("독감은 지연 대상에서 제외", "FLU" in overdue)
    }

    @Test fun milestones() {
        val keys = MilestoneContent.all.map { it.key }
        assertEquals(keys.size, keys.toSet().size)
        assertEquals(2, MilestoneContent.currentBand(0))
        assertEquals(12, MilestoneContent.currentBand(14))
        assertEquals(72, MilestoneContent.currentBand(100))
    }

    @Test fun growthStandards() {
        val med = GrowthStandards.median(Gender.BOY, GrowthMetric.HEIGHT, 12.0)
        assertEquals(75.7, med, 0.01)
        val p50 = GrowthStandards.percentile(Gender.GIRL, GrowthMetric.WEIGHT, 6.0, GrowthStandards.median(Gender.GIRL, GrowthMetric.WEIGHT, 6.0))
        assertEquals(50.0, p50, 0.5)
        // 보간: 13개월은 12~15개월 사이
        val m13 = GrowthStandards.median(Gender.BOY, GrowthMetric.HEIGHT, 13.0)
        assertTrue(m13 > 75.7 && m13 < 79.1)
        assertTrue(GrowthStandards.percentile(Gender.BOY, GrowthMetric.HEIGHT, 12.0, 90.0) > 97)
        assertTrue(GrowthStandards.percentile(Gender.BOY, GrowthMetric.HEIGHT, 12.0, 65.0) < 3)
        assertEquals(22.86, GrowthStandards.bmi(175.0, 70.0), 0.01)
    }

    @Test fun temperatureAdvice() {
        assertTrue(SymptomContent.tempAdvice(38.2, 2).contains("응급"))
        assertTrue(SymptomContent.tempAdvice(36.8, 12).contains("정상"))
        assertTrue(SymptomContent.tempAdvice(40.3, 30).contains("응급실"))
    }

    @Test fun epds() {
        assertEquals(10, EpdsContent.questions.size)
        EpdsContent.questions.forEach { assertEquals(4, it.options.size) }
        assertEquals("안정적이에요", EpdsContent.interpret(5).first)
        assertEquals("주의가 필요해요", EpdsContent.interpret(10).first)
        assertEquals("전문가 상담을 권해요", EpdsContent.interpret(13).first)
    }

    @Test fun pregnancyWeeks() {
        assertEquals(4, PregnancyContent.infoFor(1).fromWeek)
        assertEquals(36, PregnancyContent.infoFor(40).fromWeek)
        assertEquals(20, PregnancyContent.infoFor(21).fromWeek)
    }

    @Test fun templates() {
        assertTrue(ChecklistTemplates.isDiaperRelated("기저귀"))
        assertFalse(ChecklistTemplates.isDiaperRelated("물티슈"))
        assertTrue(ChecklistTemplates.items(ChecklistTemplates.OUTING).any { ChecklistTemplates.isDiaperRelated(it.name) })
        assertTrue(RecipeContent.builtIn.all { it.builtIn && it.category in RecipeContent.categories })
    }
}

class FeaturesTest {
    @Test fun routesUnique() {
        val routes = Features.all.map { it.route }
        assertEquals(routes.size, routes.toSet().size)
        assertEquals(44, routes.size)
    }

    @Test fun privateByDefault() {
        val v = Visibility()
        val visible = Features.visible(v).map { it.route }
        assertTrue(Routes.COUNSEL in visible)
        assertTrue(Routes.COUNSEL_ALARM in visible)
        assertFalse("아이 기능 기본 숨김", Routes.FEEDING in visible)
        assertFalse("임신 기능 기본 숨김", Routes.PREGNANCY in visible)
        assertFalse("기저귀 기본 숨김", Routes.DIAPER in visible)
        assertTrue(Features.hiddenCount(v) > 0)
    }

    @Test fun diaperNeedsChild() {
        assertFalse(Visibility(child = false, diaper = true).allows(Privacy.DIAPER))
        assertTrue(Visibility(child = true, diaper = true).allows(Privacy.DIAPER))
        assertFalse(Visibility(child = true, diaper = false).allows(Privacy.DIAPER))
    }

    @Test fun deepLinkGate() {
        val hidden = Visibility()
        assertFalse(Features.isAllowed(Routes.MEDICATION, hidden))
        assertTrue(Features.isAllowed(Routes.counselSkill("child_listen"), hidden))
        assertTrue(Features.isAllowed(Routes.MEDICATION, Visibility(child = true)))
        assertTrue(Features.isAllowed(Routes.PREGNANCY, Visibility(pregnancy = true)))
        assertEquals(Features.all.size, Features.visible(Visibility(true, true, true)).size)
    }
}
