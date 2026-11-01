package com.momcare.app.content

/** 접종 1회차 정보. 권장 시기는 생후 개월 수 범위로 표현한다. */
data class VaccineDose(val label: String, val fromMonth: Int, val toMonth: Int)

data class VaccineDef(
    val code: String,
    val name: String,
    val disease: String,
    val national: Boolean,
    val note: String,
    val doses: List<VaccineDose>
) {
    fun doseKey(index: Int) = "$code#$index"
}

/**
 * 대한민국 국가예방접종 표준 일정을 단순화한 참고 자료.
 * 실제 접종 시기는 반드시 소아과 의사와 상의하고 질병관리청 최신 일정을 확인하세요.
 */
object VaccineContent {
    val all: List<VaccineDef> = listOf(
        VaccineDef("BCG", "BCG (결핵)", "결핵", true, "생후 4주 이내 피내용 1회", listOf(VaccineDose("1회", 0, 1))),
        VaccineDef(
            "HEPB", "B형간염", "B형간염", true, "0·1·6개월 총 3회",
            listOf(VaccineDose("1차", 0, 0), VaccineDose("2차", 1, 2), VaccineDose("3차", 6, 8))
        ),
        VaccineDef(
            "DTAP", "DTaP (디프테리아·파상풍·백일해)", "디프테리아/파상풍/백일해", true, "5회 접종, 11~12세 Tdap 추가",
            listOf(
                VaccineDose("1차", 2, 3), VaccineDose("2차", 4, 5), VaccineDose("3차", 6, 7),
                VaccineDose("4차", 15, 18), VaccineDose("5차", 48, 72)
            )
        ),
        VaccineDef(
            "IPV", "IPV (소아마비)", "폴리오", true, "4회 접종",
            listOf(VaccineDose("1차", 2, 3), VaccineDose("2차", 4, 5), VaccineDose("3차", 6, 18), VaccineDose("4차", 48, 72))
        ),
        VaccineDef(
            "HIB", "Hib (b형 헤모필루스 인플루엔자)", "뇌수막염 등", true, "4회 접종",
            listOf(VaccineDose("1차", 2, 3), VaccineDose("2차", 4, 5), VaccineDose("3차", 6, 7), VaccineDose("추가", 12, 15))
        ),
        VaccineDef(
            "PCV", "폐렴구균 (PCV)", "폐렴구균 감염증", true, "4회 접종",
            listOf(VaccineDose("1차", 2, 3), VaccineDose("2차", 4, 5), VaccineDose("3차", 6, 7), VaccineDose("추가", 12, 15))
        ),
        VaccineDef(
            "ROTA", "로타바이러스", "로타 장염", false, "제품에 따라 2~3회 (경구)",
            listOf(VaccineDose("1차", 2, 3), VaccineDose("2차", 4, 5), VaccineDose("3차(제품별)", 6, 7))
        ),
        VaccineDef(
            "MMR", "MMR (홍역·유행성이하선염·풍진)", "홍역/볼거리/풍진", true, "2회 접종",
            listOf(VaccineDose("1차", 12, 15), VaccineDose("2차", 48, 72))
        ),
        VaccineDef("VAR", "수두", "수두", true, "12~15개월 1회", listOf(VaccineDose("1회", 12, 15))),
        VaccineDef(
            "HEPA", "A형간염", "A형간염", true, "12~23개월 2회 (6개월 간격)",
            listOf(VaccineDose("1차", 12, 23), VaccineDose("2차", 18, 35))
        ),
        VaccineDef(
            "JE", "일본뇌염 (사백신)", "일본뇌염", true, "5회 접종 (생백신은 2회)",
            listOf(
                VaccineDose("1차", 12, 23), VaccineDose("2차", 13, 24), VaccineDose("3차", 24, 35),
                VaccineDose("4차", 72, 84), VaccineDose("5차", 144, 156)
            )
        ),
        VaccineDef(
            "FLU", "인플루엔자 (독감)", "독감", true, "생후 6개월부터 매년 접종, 첫해 2회",
            listOf(VaccineDose("첫해 1차", 6, 12), VaccineDose("첫해 2차", 7, 13), VaccineDose("매년", 18, 216))
        )
    )

    fun byCode(code: String) = all.firstOrNull { it.code == code }

    /** 현재 월령에서 접종 가능한 회차 키 목록 */
    fun dueNow(ageMonths: Int, doneKeys: Set<String>): List<Pair<VaccineDef, Int>> =
        all.flatMap { v ->
            v.doses.mapIndexedNotNull { i, d ->
                if (v.doseKey(i) !in doneKeys && ageMonths in d.fromMonth..d.toMonth) v to i else null
            }
        }

    /** 권장 시기가 지났는데 미접종인 회차 */
    fun overdue(ageMonths: Int, doneKeys: Set<String>): List<Pair<VaccineDef, Int>> =
        all.flatMap { v ->
            v.doses.mapIndexedNotNull { i, d ->
                if (v.doseKey(i) !in doneKeys && ageMonths > d.toMonth && v.code != "FLU") v to i else null
            }
        }

    fun totalDoses(): Int = all.sumOf { it.doses.size }

    val checklist = listOf(
        "접종 전 아이가 열이 없는지 체온을 확인하세요.",
        "접종 기록(수첩)과 보험카드를 챙기세요.",
        "접종 후 20~30분은 병원에서 관찰하세요.",
        "접종 당일은 목욕을 가볍게 하고 접종 부위를 문지르지 마세요.",
        "38.5℃ 이상의 고열, 경련, 심한 보챔·처짐이 있으면 즉시 병원에 연락하세요."
    )
}
