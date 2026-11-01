package com.momcare.app.content

enum class MilestoneDomain(val label: String, val emoji: String) {
    GROSS("대근육", "🏃"), FINE("소근육", "✋"), LANGUAGE("언어", "💬"), SOCIAL("사회·정서", "🤗"), COGNITIVE("인지", "🧩")
}

data class Milestone(
    val key: String,
    val domain: MilestoneDomain,
    /** 보통 이 월령 전후에 나타남 */
    val month: Int,
    val text: String
)

/** 월령별 발달 이정표 (참고용). 개인차가 크므로 걱정되면 소아과에서 상담하세요. */
object MilestoneContent {
    private fun m(key: String, d: MilestoneDomain, month: Int, text: String) = Milestone(key, d, month, text)

    val all: List<Milestone> = listOf(
        // 2개월
        m("g2a", MilestoneDomain.GROSS, 2, "엎드렸을 때 잠깐 고개를 든다"),
        m("s2a", MilestoneDomain.SOCIAL, 2, "사람 얼굴을 보고 웃는다(사회적 미소)"),
        m("l2a", MilestoneDomain.LANGUAGE, 2, "'아~', '우~' 소리를 낸다"),
        m("c2a", MilestoneDomain.COGNITIVE, 2, "움직이는 물체를 눈으로 따라간다"),
        // 4개월
        m("g4a", MilestoneDomain.GROSS, 4, "엎드린 상태에서 가슴까지 들어 올린다"),
        m("g4b", MilestoneDomain.GROSS, 4, "목을 가눈다"),
        m("f4a", MilestoneDomain.FINE, 4, "손을 입으로 가져가고 장난감을 쥔다"),
        m("l4a", MilestoneDomain.LANGUAGE, 4, "소리 내어 웃는다"),
        m("s4a", MilestoneDomain.SOCIAL, 4, "엄마 목소리에 반응한다"),
        // 6개월
        m("g6a", MilestoneDomain.GROSS, 6, "뒤집기를 한다"),
        m("g6b", MilestoneDomain.GROSS, 6, "도움을 받아 앉는다"),
        m("f6a", MilestoneDomain.FINE, 6, "한 손에서 다른 손으로 물건을 옮긴다"),
        m("l6a", MilestoneDomain.LANGUAGE, 6, "옹알이를 한다 ('바바', '마마')"),
        m("s6a", MilestoneDomain.SOCIAL, 6, "낯선 사람을 구별한다"),
        m("c6a", MilestoneDomain.COGNITIVE, 6, "떨어진 물건을 찾아본다"),
        // 9개월
        m("g9a", MilestoneDomain.GROSS, 9, "혼자 앉는다"),
        m("g9b", MilestoneDomain.GROSS, 9, "기어 다닌다"),
        m("g9c", MilestoneDomain.GROSS, 9, "붙잡고 선다"),
        m("f9a", MilestoneDomain.FINE, 9, "엄지와 검지로 작은 물건을 집는다"),
        m("l9a", MilestoneDomain.LANGUAGE, 9, "자기 이름에 반응한다"),
        m("s9a", MilestoneDomain.SOCIAL, 9, "까꿍 놀이를 좋아한다"),
        m("c9a", MilestoneDomain.COGNITIVE, 9, "숨긴 물건을 찾는다(대상영속성)"),
        // 12개월
        m("g12a", MilestoneDomain.GROSS, 12, "붙잡고 걷는다"),
        m("g12b", MilestoneDomain.GROSS, 12, "혼자 잠깐 선다"),
        m("f12a", MilestoneDomain.FINE, 12, "컵을 잡고 마시려 한다"),
        m("l12a", MilestoneDomain.LANGUAGE, 12, "'엄마', '아빠'를 의미 있게 말한다"),
        m("l12b", MilestoneDomain.LANGUAGE, 12, "'안녕', '짝짜꿍' 같은 간단한 몸짓을 따라한다"),
        m("s12a", MilestoneDomain.SOCIAL, 12, "원하는 것을 손가락으로 가리킨다"),
        // 15개월
        m("g15a", MilestoneDomain.GROSS, 15, "혼자 걷는다"),
        m("f15a", MilestoneDomain.FINE, 15, "숟가락을 잡고 입에 가져간다"),
        m("l15a", MilestoneDomain.LANGUAGE, 15, "의미 있는 단어를 3~5개 말한다"),
        m("c15a", MilestoneDomain.COGNITIVE, 15, "간단한 지시(\"주세요\")를 따른다"),
        // 18개월
        m("g18a", MilestoneDomain.GROSS, 18, "계단을 손잡고 오른다"),
        m("g18b", MilestoneDomain.GROSS, 18, "공을 발로 찬다"),
        m("f18a", MilestoneDomain.FINE, 18, "블록을 3~4개 쌓는다"),
        m("l18a", MilestoneDomain.LANGUAGE, 18, "단어를 10개 이상 말한다"),
        m("s18a", MilestoneDomain.SOCIAL, 18, "다른 아이 옆에서 병행 놀이를 한다"),
        m("c18a", MilestoneDomain.COGNITIVE, 18, "신체 부위를 3가지 이상 가리킨다"),
        // 24개월
        m("g24a", MilestoneDomain.GROSS, 24, "뛰어다닌다"),
        m("g24b", MilestoneDomain.GROSS, 24, "두 발로 점프를 시도한다"),
        m("f24a", MilestoneDomain.FINE, 24, "크레용으로 선을 긋는다"),
        m("l24a", MilestoneDomain.LANGUAGE, 24, "두 단어를 이어 말한다 ('엄마 물')"),
        m("s24a", MilestoneDomain.SOCIAL, 24, "'내 거야'를 자주 말한다"),
        m("c24a", MilestoneDomain.COGNITIVE, 24, "간단한 소꿉놀이를 한다"),
        // 36개월
        m("g36a", MilestoneDomain.GROSS, 36, "세발자전거를 탄다"),
        m("g36b", MilestoneDomain.GROSS, 36, "한 발로 잠깐 선다"),
        m("f36a", MilestoneDomain.FINE, 36, "동그라미를 따라 그린다"),
        m("f36b", MilestoneDomain.FINE, 36, "블록을 8개 정도 쌓는다"),
        m("l36a", MilestoneDomain.LANGUAGE, 36, "3~4단어 문장으로 말한다"),
        m("l36b", MilestoneDomain.LANGUAGE, 36, "자기 이름과 나이를 말한다"),
        m("s36a", MilestoneDomain.SOCIAL, 36, "순서 기다리기를 연습한다"),
        m("c36a", MilestoneDomain.COGNITIVE, 36, "색깔을 2~3가지 구별한다"),
        // 48개월
        m("g48a", MilestoneDomain.GROSS, 48, "한 발로 깡충 뛴다"),
        m("f48a", MilestoneDomain.FINE, 48, "가위로 종이를 자른다"),
        m("l48a", MilestoneDomain.LANGUAGE, 48, "경험한 일을 이야기로 말한다"),
        m("s48a", MilestoneDomain.SOCIAL, 48, "친구와 역할놀이를 한다"),
        m("c48a", MilestoneDomain.COGNITIVE, 48, "숫자를 1~10까지 센다"),
        // 60개월
        m("g60a", MilestoneDomain.GROSS, 60, "줄넘기나 공 던지고 받기를 한다"),
        m("f60a", MilestoneDomain.FINE, 60, "네모·세모를 그린다"),
        m("l60a", MilestoneDomain.LANGUAGE, 60, "긴 문장으로 대화한다"),
        m("s60a", MilestoneDomain.SOCIAL, 60, "규칙이 있는 게임을 즐긴다"),
        m("c60a", MilestoneDomain.COGNITIVE, 60, "자기 이름을 쓴다"),
        // 72개월
        m("g72a", MilestoneDomain.GROSS, 72, "두 발 자전거에 도전한다"),
        m("f72a", MilestoneDomain.FINE, 72, "글씨를 또박또박 쓴다"),
        m("l72a", MilestoneDomain.LANGUAGE, 72, "받아쓰기나 짧은 글 읽기를 한다"),
        m("s72a", MilestoneDomain.SOCIAL, 72, "친구 감정을 헤아려 말한다"),
        m("c72a", MilestoneDomain.COGNITIVE, 72, "간단한 덧셈 개념을 이해한다")
    )

    val bands: List<Int> = all.map { it.month }.distinct().sorted()

    fun bandLabel(month: Int): String = if (month < 24) "${month}개월" else "만 ${month / 12}세 (${month}개월)"

    /** 아이의 현재 월령이 속한 구간 (가장 가까운 이하 구간) */
    fun currentBand(ageMonths: Int): Int = bands.lastOrNull { it <= ageMonths } ?: bands.first()

    fun forBand(month: Int): List<Milestone> = all.filter { it.month == month }

    val redFlags = listOf(
        "3개월: 소리나 빛에 전혀 반응하지 않는다",
        "6개월: 안아줘도 눈을 맞추지 않거나 웃지 않는다",
        "9개월: 옹알이가 전혀 없고 도움 없이 앉지 못한다",
        "12개월: 이름을 불러도 반응하지 않고 가리키기/손 흔들기가 없다",
        "18개월: 의미 있는 단어가 없거나 걷지 못한다",
        "24개월: 두 단어 조합이 없고 이전에 하던 말·행동이 사라진다"
    )
}
