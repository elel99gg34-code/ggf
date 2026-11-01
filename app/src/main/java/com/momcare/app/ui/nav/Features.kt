package com.momcare.app.ui.nav

/**
 * 비공개(숨김) 기능 묶음. 설정 > 기능 표시에서 켜야 홈과 메뉴에 나타난다.
 * - CHILD: 아이 프로필·육아 기록·건강·발달 등 아이 관련 기능
 * - PREGNANCY: 임신 주차·태동·진통 타이머
 * - DIAPER: 기저귀 관련 (CHILD 가 켜져 있어야 의미가 있음)
 */
enum class Privacy { CHILD, PREGNANCY, DIAPER }

/** 현재 표시 설정 */
data class Visibility(
    val child: Boolean = false,
    val pregnancy: Boolean = false,
    val diaper: Boolean = false
) {
    fun allows(p: Privacy?): Boolean = when (p) {
        null -> true
        Privacy.CHILD -> child
        Privacy.PREGNANCY -> pregnancy
        Privacy.DIAPER -> child && diaper
    }
}

/** 홈 화면에 노출되는 기능 한 개 */
data class Feature(
    val route: String,
    val emoji: String,
    val title: String,
    val desc: String,
    val group: FeatureGroup,
    /** null 이면 항상 표시, 아니면 해당 설정이 켜져야 표시 */
    val privacy: Privacy? = null
)

enum class FeatureGroup(val title: String, val emoji: String) {
    COUNSEL("상담·소통", "💬"),
    MOM("엄마 케어", "🌷"),
    FAMILY("가족 살림", "🏠"),
    PREGNANCY("임신·출산", "🤰"),
    TRACK("육아 기록", "📒"),
    HEALTH("건강·성장", "🩺"),
    KIDS("아이 활동", "🎈"),
    SAFETY("안전·돌봄", "🛡️")
}

object Routes {
    const val HOME = "home"
    const val LOGIN = "login"
    const val SIGNUP = "signup"
    const val SETTINGS = "settings"

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

    // 추가 기능 10종
    const val CONTRACTION = "contraction"
    const val PREGNANCY = "pregnancy"
    const val HANDOVER = "handover"
    const val SUPPLY = "supply"
    const val PATTERN = "pattern"
    const val SAFETY = "safety"
    const val OUTING = "outing"
    const val HABIT = "habit"
    const val BOOK = "book"
    const val RECIPE = "recipe"

    fun counselSkill(id: String) = "counsel_skill/$id"
}

object Features {
    private val C = Privacy.CHILD
    private val P = Privacy.PREGNANCY

    val all = listOf(
        // 상담·소통 (항상 표시)
        Feature(Routes.COUNSEL, "💬", "상담 스킬 코치", "아이·배우자·선생님·의사와 대화법", FeatureGroup.COUNSEL),
        Feature(Routes.COUNSEL_ALARM, "⏰", "상담 스킬 알람", "시간마다 오늘의 스킬 알림", FeatureGroup.COUNSEL),
        Feature(Routes.COUNSEL_JOURNAL, "📝", "상담 일지", "상담 준비·돌아보기", FeatureGroup.COUNSEL),
        Feature(Routes.CRY_HELPER, "😭", "울음 도우미", "우는 이유 찾기", FeatureGroup.COUNSEL, C),

        // 엄마 케어
        Feature(Routes.MOM_MIND, "💗", "마음 건강", "기분 기록·산후우울 자가점검", FeatureGroup.MOM),
        Feature(Routes.SELF_CARE, "🌷", "셀프케어", "물·영양제·나만의 시간", FeatureGroup.MOM),
        Feature(Routes.WHITE_NOISE, "🎧", "백색소음", "타이머 포함 수면 사운드", FeatureGroup.MOM),
        Feature(Routes.DIARY, "📔", "일기", "사진과 함께 기록", FeatureGroup.MOM),

        // 가족 살림
        Feature(Routes.CALENDAR, "📅", "가족 캘린더", "일정·예약·기념일 통합", FeatureGroup.FAMILY),
        Feature(Routes.TODO, "✅", "할 일", "가족 공동 할 일", FeatureGroup.FAMILY),
        Feature(Routes.SHOPPING, "🛒", "장보기 목록", "체크리스트", FeatureGroup.FAMILY),
        Feature(Routes.MEAL_PLAN, "🍱", "주간 식단", "일주일 식단 계획", FeatureGroup.FAMILY),
        Feature(Routes.RECIPE, "🍳", "레시피북", "이유식·유아식·간식", FeatureGroup.FAMILY),
        Feature(Routes.EXPENSE, "💰", "가계부", "카테고리별 지출", FeatureGroup.FAMILY),
        Feature(Routes.SUPPLY, "📦", "생활 소모품 재고", "소진일 예측·장보기 연동", FeatureGroup.FAMILY),
        Feature(Routes.ANNIVERSARY, "🎉", "기념일 D-day", "생일·기념일", FeatureGroup.FAMILY),
        Feature(Routes.APPOINTMENT, "🏥", "병원 예약", "진료 일정과 알림", FeatureGroup.FAMILY),

        // 임신·출산 (비공개)
        Feature(Routes.PREGNANCY, "🤰", "임신 주차·태동", "주차별 정보, 태동 카운터", FeatureGroup.PREGNANCY, P),
        Feature(Routes.CONTRACTION, "⏱️", "진통 타이머", "간격·지속시간, 5-1-1 알림", FeatureGroup.PREGNANCY, P),

        // 육아 기록 (비공개)
        Feature(Routes.CHILDREN, "👶", "아이 프로필", "여러 아이 등록·전환", FeatureGroup.TRACK, C),
        Feature(Routes.FEEDING, "🍼", "수유 기록", "모유·분유·유축, 타이머", FeatureGroup.TRACK, C),
        Feature(Routes.SOLID, "🥣", "이유식", "단계 가이드·반응 기록", FeatureGroup.TRACK, C),
        Feature(Routes.SLEEP, "🌙", "수면 기록", "낮잠·밤잠 타이머, 통계", FeatureGroup.TRACK, C),
        Feature(Routes.DIAPER, "🧷", "기저귀·배변", "소변·대변·발진", FeatureGroup.TRACK, Privacy.DIAPER),
        Feature(Routes.PATTERN, "🔍", "패턴 분석", "다음 수유 예상·수면 인사이트", FeatureGroup.TRACK, C),
        Feature(Routes.REPORT, "📊", "일일·주간 리포트", "하루를 한눈에", FeatureGroup.TRACK, C),

        // 건강·성장 (비공개)
        Feature(Routes.GROWTH, "📏", "성장 기록", "키·몸무게·머리둘레 그래프", FeatureGroup.HEALTH, C),
        Feature(Routes.GROWTH_COMPARE, "📈", "또래 비교", "성장 백분위 분석", FeatureGroup.HEALTH, C),
        Feature(Routes.VACCINE, "💉", "예방접종", "국가접종 일정 관리", FeatureGroup.HEALTH, C),
        Feature(Routes.HEALTH, "🌡️", "체온·증상", "열 기록과 대처 안내", FeatureGroup.HEALTH, C),
        Feature(Routes.MEDICATION, "💊", "투약 관리", "복용 알림과 기록", FeatureGroup.HEALTH, C),
        Feature(Routes.ALLERGY, "🥜", "알레르기", "원인·증상 관리", FeatureGroup.HEALTH, C),
        Feature(Routes.MILESTONE, "🌱", "발달 체크", "월령별 이정표", FeatureGroup.HEALTH, C),

        // 아이 활동 (비공개)
        Feature(Routes.HABIT, "✨", "습관 루틴", "양치·정리·독서 습관", FeatureGroup.KIDS, C),
        Feature(Routes.REWARD, "⭐", "칭찬 스티커", "보상 교환", FeatureGroup.KIDS, C),
        Feature(Routes.BOOK, "📚", "그림책 독서 기록", "읽어준 책·시간 통계", FeatureGroup.KIDS, C),
        Feature(Routes.SCHOOL, "🎒", "준비물·시간표", "어린이집·학교", FeatureGroup.KIDS, C),
        Feature(Routes.PLAY, "🧩", "놀이 추천", "월령별 놀이 아이디어", FeatureGroup.KIDS, C),
        Feature(Routes.TIPS, "📚", "월령별 육아 팁", "시기별 가이드", FeatureGroup.KIDS, C),

        // 안전·돌봄
        Feature(Routes.EMERGENCY, "🚑", "응급 가이드", "응급처치·비상 연락처", FeatureGroup.SAFETY),
        Feature(Routes.SAFETY, "🛡️", "집 안전 점검", "공간별 안전 체크리스트", FeatureGroup.SAFETY, C),
        Feature(Routes.OUTING, "👜", "외출 가방 체크", "나가기 전 확인", FeatureGroup.SAFETY, C),
        Feature(Routes.HANDOVER, "📋", "돌봄 인수인계", "조부모·시터에게 공유", FeatureGroup.SAFETY, C),
        Feature(Routes.GEAR, "🧸", "육아용품 체크", "출산·육아 준비물", FeatureGroup.SAFETY, C)
    )

    private val byRoute = all.associateBy { it.route }

    fun visible(v: Visibility): List<Feature> = all.filter { v.allows(it.privacy) }

    fun byGroup(v: Visibility): Map<FeatureGroup, List<Feature>> =
        FeatureGroup.entries.associateWith { g -> visible(v).filter { it.group == g } }
            .filterValues { it.isNotEmpty() }

    /** 비공개 기능의 화면에 직접 들어온 경우(알림, 링크 등) 확인용 */
    fun isAllowed(route: String, v: Visibility): Boolean {
        val base = route.substringBefore("/")
        val f = byRoute[route] ?: byRoute.values.firstOrNull { it.route.substringBefore("/") == base }
        return f == null || v.allows(f.privacy)
    }

    /** 숨겨진 기능 개수 (설정 화면 안내용) */
    fun hiddenCount(v: Visibility): Int = all.size - visible(v).size
}
