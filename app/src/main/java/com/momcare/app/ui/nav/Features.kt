package com.momcare.app.ui.nav

/** 홈 화면에 노출되는 기능 한 개 */
data class Feature(
    val route: String,
    val emoji: String,
    val title: String,
    val desc: String,
    val group: FeatureGroup,
    /** 설정에서 켜야만 보이는 기능의 키 (예: "diaper"). null 이면 항상 표시 */
    val optionalKey: String? = null
)

enum class FeatureGroup(val title: String, val emoji: String) {
    TRACK("육아 기록", "📒"),
    HEALTH("건강·성장", "🩺"),
    COUNSEL("상담·소통", "💬"),
    FAMILY("가족 살림", "🏠"),
    MOM("엄마 케어", "🌷"),
    KIDS("아이 활동", "🎈")
}

object Routes {
    const val HOME = "home"
    const val CHILDREN = "children"
    const val GROWTH = "growth"
    const val GROWTH_COMPARE = "growth_compare"
    const val VACCINE = "vaccine"
    const val FEEDING = "feeding"
    const val SOLID = "solid"
    const val SLEEP = "sleep"
    const val DIAPER = "diaper"
    const val HEALTH = "health"
    const val MEDICATION = "medication"
    const val APPOINTMENT = "appointment"
    const val MILESTONE = "milestone"
    const val DIARY = "diary"
    const val ANNIVERSARY = "anniversary"
    const val TODO = "todo"
    const val SHOPPING = "shopping"
    const val MEAL_PLAN = "meal_plan"
    const val EXPENSE = "expense"
    const val CALENDAR = "calendar"
    const val ALLERGY = "allergy"
    const val EMERGENCY = "emergency"
    const val WHITE_NOISE = "white_noise"
    const val CRY_HELPER = "cry_helper"
    const val MOM_MIND = "mom_mind"
    const val SELF_CARE = "self_care"
    const val GEAR = "gear"
    const val SCHOOL = "school"
    const val REWARD = "reward"
    const val PLAY = "play"
    const val TIPS = "tips"
    const val COUNSEL = "counsel"
    const val COUNSEL_ALARM = "counsel_alarm"
    const val COUNSEL_JOURNAL = "counsel_journal"
    const val COUNSEL_SKILL = "counsel_skill/{id}"
    const val REPORT = "report"
    const val SETTINGS = "settings"

    fun counselSkill(id: String) = "counsel_skill/$id"
}

object Features {
    val all = listOf(
        // 육아 기록
        Feature(Routes.CHILDREN, "👶", "아이 프로필", "여러 아이 등록·전환", FeatureGroup.TRACK),
        Feature(Routes.FEEDING, "🍼", "수유 기록", "모유·분유·유축, 타이머", FeatureGroup.TRACK),
        Feature(Routes.SOLID, "🥣", "이유식", "단계 가이드·반응 기록", FeatureGroup.TRACK),
        Feature(Routes.SLEEP, "🌙", "수면 기록", "낮잠·밤잠 타이머, 통계", FeatureGroup.TRACK),
        Feature(Routes.DIAPER, "🧷", "기저귀·배변", "소변·대변·발진", FeatureGroup.TRACK, optionalKey = OPT_DIAPER),
        Feature(Routes.DIARY, "📔", "육아 일기", "사진과 함께 기록", FeatureGroup.TRACK),
        Feature(Routes.REPORT, "📊", "일일·주간 리포트", "하루를 한눈에", FeatureGroup.TRACK),
        // 건강·성장
        Feature(Routes.GROWTH, "📏", "성장 기록", "키·몸무게·머리둘레 그래프", FeatureGroup.HEALTH),
        Feature(Routes.GROWTH_COMPARE, "📈", "또래 비교", "성장 백분위 분석", FeatureGroup.HEALTH),
        Feature(Routes.VACCINE, "💉", "예방접종", "국가접종 일정 관리", FeatureGroup.HEALTH),
        Feature(Routes.HEALTH, "🌡️", "체온·증상", "열 기록과 대처 안내", FeatureGroup.HEALTH),
        Feature(Routes.MEDICATION, "💊", "투약 관리", "복용 알림과 기록", FeatureGroup.HEALTH),
        Feature(Routes.APPOINTMENT, "🏥", "병원 예약", "진료 일정과 알림", FeatureGroup.HEALTH),
        Feature(Routes.ALLERGY, "🥜", "알레르기", "원인·증상 관리", FeatureGroup.HEALTH),
        Feature(Routes.MILESTONE, "🌱", "발달 체크", "월령별 이정표", FeatureGroup.HEALTH),
        Feature(Routes.EMERGENCY, "🚑", "응급 가이드", "응급처치·비상 연락처", FeatureGroup.HEALTH),
        // 상담·소통
        Feature(Routes.COUNSEL, "💬", "상담 스킬 코치", "아이·배우자·선생님·의사와 대화법", FeatureGroup.COUNSEL),
        Feature(Routes.COUNSEL_ALARM, "⏰", "상담 스킬 알람", "시간마다 오늘의 스킬 알림", FeatureGroup.COUNSEL),
        Feature(Routes.COUNSEL_JOURNAL, "📝", "상담 일지", "상담 준비·돌아보기", FeatureGroup.COUNSEL),
        Feature(Routes.CRY_HELPER, "😭", "울음 도우미", "우는 이유 찾기", FeatureGroup.COUNSEL),
        // 가족 살림
        Feature(Routes.CALENDAR, "📅", "가족 캘린더", "일정·접종·예약 통합", FeatureGroup.FAMILY),
        Feature(Routes.TODO, "✅", "할 일", "가족 공동 할 일", FeatureGroup.FAMILY),
        Feature(Routes.SHOPPING, "🛒", "장보기 목록", "체크리스트", FeatureGroup.FAMILY),
        Feature(Routes.MEAL_PLAN, "🍱", "주간 식단", "일주일 식단 계획", FeatureGroup.FAMILY),
        Feature(Routes.EXPENSE, "💰", "육아 가계부", "카테고리별 지출", FeatureGroup.FAMILY),
        Feature(Routes.ANNIVERSARY, "🎉", "기념일 D-day", "백일·돌·생일", FeatureGroup.FAMILY),
        Feature(Routes.GEAR, "🧸", "육아용품 체크", "준비물 리스트", FeatureGroup.FAMILY),
        // 엄마 케어
        Feature(Routes.MOM_MIND, "💗", "마음 건강", "기분 기록·산후우울 자가점검", FeatureGroup.MOM),
        Feature(Routes.SELF_CARE, "🌷", "셀프케어", "물·영양제·나만의 시간", FeatureGroup.MOM),
        Feature(Routes.WHITE_NOISE, "🎧", "백색소음", "타이머 포함 수면 사운드", FeatureGroup.MOM),
        // 아이 활동
        Feature(Routes.SCHOOL, "🎒", "준비물·시간표", "어린이집·학교", FeatureGroup.KIDS),
        Feature(Routes.REWARD, "⭐", "칭찬 스티커", "보상 교환", FeatureGroup.KIDS),
        Feature(Routes.PLAY, "🧩", "놀이 추천", "월령별 놀이 아이디어", FeatureGroup.KIDS),
        Feature(Routes.TIPS, "📚", "월령별 육아 팁", "시기별 가이드", FeatureGroup.KIDS)
    )

    const val OPT_DIAPER = "diaper"

    fun visible(showDiaper: Boolean): List<Feature> =
        all.filter { it.optionalKey == null || (it.optionalKey == OPT_DIAPER && showDiaper) }

    fun byGroup(showDiaper: Boolean) =
        FeatureGroup.entries.associateWith { g -> visible(showDiaper).filter { it.group == g } }
            .filterValues { it.isNotEmpty() }
}
