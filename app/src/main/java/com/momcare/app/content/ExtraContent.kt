package com.momcare.app.content

import com.momcare.app.data.ChecklistItem
import com.momcare.app.data.Recipe
import com.momcare.app.data.Supply

// ───────────────────── 임신 주차 ─────────────────────

data class PregnancyWeekInfo(val fromWeek: Int, val toWeek: Int, val babySize: String, val baby: String, val mom: String, val todo: List<String>)

object PregnancyContent {
    const val TOTAL_DAYS = 280

    val weeks = listOf(
        PregnancyWeekInfo(4, 7, "참깨~블루베리", "심장이 뛰기 시작하고 신경관이 만들어져요.", "입덧과 피로감이 시작될 수 있어요.",
            listOf("엽산 복용 확인", "첫 산부인과 방문", "임신 확인서 발급(국민행복카드 신청)")),
        PregnancyWeekInfo(8, 11, "라즈베리~라임", "팔다리가 생기고 손가락이 구분돼요.", "입덧이 가장 심한 시기예요. 조금씩 자주 드세요.",
            listOf("1차 기형아 검사 일정 확인", "직장 임신 사실 알리기 검토")),
        PregnancyWeekInfo(12, 15, "레몬~사과", "얼굴 생김새가 뚜렷해지고 움직임이 활발해요.", "입덧이 줄고 안정기에 들어서요.",
            listOf("NT(목덜미 투명대) 검사", "임산부 배지 수령")),
        PregnancyWeekInfo(16, 19, "아보카도~망고", "소리를 듣기 시작해요.", "첫 태동을 느낄 수 있어요.",
            listOf("2차 기형아 검사", "태교 시작해보기")),
        PregnancyWeekInfo(20, 23, "바나나~옥수수", "성별 확인이 가능하고 피부가 생겨요.", "배가 눈에 띄게 나와요. 허리 통증 주의.",
            listOf("정밀 초음파", "임신성 당뇨 검사 일정 확인")),
        PregnancyWeekInfo(24, 27, "콜리플라워~양배추", "폐가 발달하고 눈을 떠요.", "다리 부종, 쥐가 날 수 있어요.",
            listOf("임신성 당뇨 검사", "출산 병원·조리원 알아보기")),
        PregnancyWeekInfo(28, 31, "가지~코코넛", "뇌가 빠르게 자라고 잠을 자고 깨는 주기가 생겨요.", "숨이 차고 속쓰림이 생길 수 있어요.",
            listOf("태동 카운트 매일 하기", "출산 준비물 정리 시작")),
        PregnancyWeekInfo(32, 35, "파인애플~멜론", "지방이 쌓이며 통통해져요.", "가진통(브랙스톤 힉스)이 올 수 있어요.",
            listOf("출산 가방 싸기", "산후조리 계획 확정", "카시트 설치")),
        PregnancyWeekInfo(36, 42, "수박", "출산 준비 완료! 머리가 아래로 내려와요.", "골반 압박감이 커지고 진통이 시작될 수 있어요.",
            listOf("진통 타이머 사용법 익히기", "병원 연락처·이동 경로 확인", "양수가 터지면 바로 병원으로"))
    )

    fun infoFor(week: Int): PregnancyWeekInfo =
        weeks.firstOrNull { week in it.fromWeek..it.toWeek } ?: if (week < 4) weeks.first() else weeks.last()

    val contractionRules = listOf(
        "5-1-1 규칙: 진통이 5분 간격으로, 1분씩, 1시간 이상 지속되면 병원에 연락하세요 (초산 기준).",
        "경산모는 10분 간격이 규칙적이면 미리 출발하세요.",
        "양수가 흐르거나, 출혈이 많거나, 태동이 확 줄면 간격과 상관없이 바로 병원에 가세요."
    )

    val kickGuide = listOf(
        "아기가 활발한 시간(식후, 저녁)에 편하게 옆으로 누워 세어요.",
        "2시간 안에 10번 이상 움직이면 정상 범위로 봐요.",
        "평소보다 태동이 확연히 줄었다면 바로 병원에 연락하세요."
    )
}

// ───────────────────── 체크리스트 템플릿 ─────────────────────

object ChecklistTemplates {
    const val SAFETY = "SAFETY"
    const val OUTING = "OUTING"

    private val safety: List<Pair<String, List<String>>> = listOf(
        "거실" to listOf("가구 모서리 보호대 설치", "TV·서랍장 벽에 고정", "콘센트 안전 커버", "전선 정리", "작은 물건(동전, 단추) 치우기"),
        "주방" to listOf("가스레인지 안전 커버", "칼·가위 높은 곳 보관", "세제 잠금 서랍 보관", "뜨거운 냄비 손잡이 안쪽으로"),
        "욕실" to listOf("미끄럼 방지 매트", "욕조 물 바로 빼기", "변기 뚜껑 잠금", "약·화장품 잠금 보관"),
        "침실" to listOf("침대 난간 설치", "창문 추락 방지 장치", "블라인드 줄 묶어두기", "아기 침대에 푹신한 물건 치우기"),
        "현관·계단" to listOf("계단 안전문", "현관문 이중 잠금", "신발장 고정"),
        "응급 대비" to listOf("소화기 위치 확인", "구급상자 준비", "응급 연락처 냉장고에 부착", "화재 감지기 작동 확인")
    )

    private val outing: List<Pair<String, List<String>>> = listOf(
        "먹을 것" to listOf("분유/이유식", "젖병·스푼", "물", "간식", "턱받이"),
        "위생" to listOf("기저귀", "물티슈", "비닐봉투", "손소독제", "여벌옷 1벌"),
        "건강" to listOf("체온계", "해열제", "선크림", "모기 기피제"),
        "기타" to listOf("손수건", "장난감 1개", "모자", "아기띠/유모차", "보험카드·아기수첩")
    )

    fun items(listKey: String): List<ChecklistItem> {
        val src = if (listKey == SAFETY) safety else outing
        return src.flatMap { (cat, names) ->
            names.mapIndexed { i, n -> ChecklistItem(listKey = listKey, category = cat, name = n, sortOrder = i) }
        }
    }

    /** 기저귀 관련 항목인지 판단 (기저귀 기능을 숨기면 체크리스트에서도 숨김) */
    fun isDiaperRelated(name: String) = name.contains("기저귀")
}

// ───────────────────── 소모품 기본 목록 ─────────────────────

object SupplyContent {
    val defaults = listOf(
        Supply(name = "기저귀", emoji = "🧷", unit = "개", dailyUse = 7.0, lowThreshold = 30.0, diaperRelated = true),
        Supply(name = "물티슈", emoji = "🧻", unit = "팩", dailyUse = 0.3, lowThreshold = 2.0),
        Supply(name = "분유", emoji = "🍼", unit = "통", dailyUse = 0.12, lowThreshold = 1.0),
        Supply(name = "젖병 세정제", emoji = "🧴", unit = "통", dailyUse = 0.03, lowThreshold = 1.0),
        Supply(name = "아기 로션", emoji = "🧴", unit = "통", dailyUse = 0.02, lowThreshold = 1.0),
        Supply(name = "엉덩이 크림", emoji = "🩹", unit = "개", dailyUse = 0.02, lowThreshold = 1.0, diaperRelated = true),
        Supply(name = "세탁 세제(아기용)", emoji = "🫧", unit = "통", dailyUse = 0.03, lowThreshold = 1.0)
    )
}

// ───────────────────── 습관 프리셋 ─────────────────────

object HabitContent {
    val presets = listOf(
        "🪥" to "양치하기", "🧸" to "장난감 정리", "📖" to "책 읽기", "🥦" to "채소 한 입",
        "👕" to "스스로 옷 입기", "🙏" to "인사하기", "🛏️" to "제시간에 자기", "💧" to "물 마시기",
        "🧼" to "손 씻기", "🎒" to "가방 챙기기"
    )
}

// ───────────────────── 그림책 추천 ─────────────────────

object BookContent {
    data class Rec(val fromMonth: Int, val toMonth: Int, val type: String, val tip: String)

    val recommendations = listOf(
        Rec(0, 6, "흑백·고대비 그림책", "선명한 그림을 보여주며 천천히 이름을 말해주세요."),
        Rec(6, 12, "촉감책·소리책", "만지고 두드리며 감각을 깨워요. 입에 넣어도 안전한 헝겊책이 좋아요."),
        Rec(12, 24, "의성어·의태어 그림책", "'멍멍', '쿵쿵' 같은 소리를 따라 말하게 해요."),
        Rec(24, 36, "생활 습관 그림책", "양치, 배변, 잠자기 등 일상을 주제로 한 책이 도움돼요."),
        Rec(36, 60, "이야기 그림책", "다음 장면을 상상해 말해보게 하면 언어·사고력이 자라요."),
        Rec(60, 96, "창작·지식 그림책", "아이가 직접 읽어보도록 하고 질문으로 대화를 이어가요.")
    )

    fun forMonth(m: Int) = recommendations.firstOrNull { m in it.fromMonth until it.toMonth } ?: recommendations.last()
}

// ───────────────────── 기본 레시피 ─────────────────────

object RecipeContent {
    val categories = listOf("이유식", "유아식", "간식", "아플 때")

    val builtIn = listOf(
        Recipe(title = "쌀미음 (10배죽)", category = "이유식", fromMonth = 5,
            ingredients = "불린 쌀 10g, 물 100ml",
            steps = "1. 불린 쌀을 곱게 간다\n2. 물을 넣고 약불에서 저어가며 15분 끓인다\n3. 체에 걸러 식힌다",
            tip = "처음엔 1~2스푼부터 시작해요.", builtIn = true),
        Recipe(title = "애호박 미음", category = "이유식", fromMonth = 6,
            ingredients = "쌀미음 80ml, 애호박 10g",
            steps = "1. 애호박 껍질을 벗겨 찐다\n2. 곱게 으깨 미음에 섞는다\n3. 한 번 더 끓인다",
            tip = "새 재료는 3일간 같은 재료로 반응을 확인해요.", builtIn = true),
        Recipe(title = "소고기 브로콜리죽", category = "이유식", fromMonth = 7,
            ingredients = "쌀 15g, 소고기 안심 10g, 브로콜리 꽃 부분 5g, 물 105ml",
            steps = "1. 소고기를 핏물 빼고 삶아 다진다\n2. 브로콜리는 데쳐 잘게 다진다\n3. 쌀과 육수를 넣고 끓이다 재료를 넣는다",
            tip = "철분 보충을 위해 소고기는 매일 조금씩 넣어주세요.", builtIn = true),
        Recipe(title = "단호박 닭죽", category = "이유식", fromMonth = 8,
            ingredients = "쌀 20g, 닭가슴살 15g, 단호박 15g, 물 120ml",
            steps = "1. 닭가슴살을 삶아 잘게 찢는다\n2. 단호박을 쪄서 으깬다\n3. 모든 재료를 넣고 저어가며 끓인다",
            tip = "닭 삶은 물을 육수로 활용하세요.", builtIn = true),
        Recipe(title = "두부 채소 진밥", category = "이유식", fromMonth = 10,
            ingredients = "밥 50g, 두부 20g, 당근·양파 각 5g, 물 적당량",
            steps = "1. 채소를 잘게 다져 볶는다\n2. 밥과 물을 넣고 무르게 끓인다\n3. 으깬 두부를 넣고 마무리",
            tip = "핑거푸드로 두부를 깍둑 썰어 따로 줘도 좋아요.", builtIn = true),
        Recipe(title = "계란찜", category = "유아식", fromMonth = 12,
            ingredients = "달걀 1개, 물 또는 육수 60ml, 다진 채소 약간",
            steps = "1. 달걀을 풀어 체에 거른다\n2. 물과 채소를 섞는다\n3. 뚜껑을 덮고 약불에서 10분 찐다",
            tip = "달걀 알레르기 확인 후 시작해요.", builtIn = true),
        Recipe(title = "소고기 주먹밥", category = "유아식", fromMonth = 12,
            ingredients = "밥 80g, 다진 소고기 20g, 다진 채소 15g, 참기름 약간",
            steps = "1. 소고기와 채소를 볶는다\n2. 밥과 섞어 한 입 크기로 뭉친다",
            tip = "스스로 집어 먹기 좋아 자기주도식에 좋아요.", builtIn = true),
        Recipe(title = "연어 감자볼", category = "유아식", fromMonth = 15,
            ingredients = "연어 30g, 감자 1/2개, 브로콜리 약간",
            steps = "1. 연어와 감자를 찐다\n2. 으깨서 섞고 동그랗게 빚는다\n3. 팬에 살짝 굴려 익힌다",
            tip = "가시를 꼭 확인하세요.", builtIn = true),
        Recipe(title = "바나나 오트밀 팬케이크", category = "간식", fromMonth = 10,
            ingredients = "바나나 1개, 오트밀 3큰술, 달걀 1개",
            steps = "1. 모든 재료를 으깨 섞는다\n2. 약불 팬에 작은 크기로 굽는다",
            tip = "설탕 없이도 달콤해요.", builtIn = true),
        Recipe(title = "고구마 치즈볼", category = "간식", fromMonth = 12,
            ingredients = "찐 고구마 100g, 아기 치즈 1장",
            steps = "1. 고구마를 으깬다\n2. 치즈를 넣고 동그랗게 빚는다\n3. 오븐이나 팬에 살짝 데운다",
            tip = "냉동 보관해두고 간식으로 꺼내 쓰세요.", builtIn = true),
        Recipe(title = "사과 퓌레", category = "간식", fromMonth = 6,
            ingredients = "사과 1/2개",
            steps = "1. 껍질과 씨를 제거한다\n2. 찐 다음 곱게 간다",
            tip = "변비가 있을 땐 배·자두 퓌레도 좋아요.", builtIn = true),
        Recipe(title = "흰죽 (장염 회복식)", category = "아플 때", fromMonth = 8,
            ingredients = "쌀 30g, 물 300ml",
            steps = "1. 쌀을 불린다\n2. 물을 넣고 퍼질 때까지 끓인다",
            tip = "설사할 땐 기름진 음식과 유제품을 잠시 피하세요.", builtIn = true),
        Recipe(title = "배숙 (기침할 때)", category = "아플 때", fromMonth = 12,
            ingredients = "배 1/2개, 대추 2알, 물 200ml",
            steps = "1. 배를 깍둑 썰고 대추를 넣는다\n2. 약불에서 20분 끓여 국물을 준다",
            tip = "꿀은 돌 이후에만 소량 사용하세요.", builtIn = true)
    )
}
