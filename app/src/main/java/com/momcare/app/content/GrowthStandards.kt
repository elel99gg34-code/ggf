package com.momcare.app.content

import com.momcare.app.data.Gender
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.sqrt

enum class GrowthMetric(val label: String, val unit: String) {
    HEIGHT("키", "cm"), WEIGHT("몸무게", "kg")
}

/**
 * WHO 성장 기준의 중앙값을 단순화한 참고 표.
 * 정확한 백분위(LMS)가 아닌 근사치이므로 의학적 판단은 소아과 성장곡선을 따르세요.
 */
object GrowthStandards {
    private data class Row(val month: Int, val median: Double, val sd: Double)

    private val boysHeight = listOf(
        Row(0, 49.9, 1.9), Row(1, 54.7, 2.0), Row(2, 58.4, 2.1), Row(3, 61.4, 2.2), Row(4, 63.9, 2.3),
        Row(5, 65.9, 2.4), Row(6, 67.6, 2.4), Row(7, 69.2, 2.5), Row(8, 70.6, 2.5), Row(9, 72.0, 2.6),
        Row(10, 73.3, 2.6), Row(11, 74.5, 2.7), Row(12, 75.7, 2.7), Row(15, 79.1, 2.9), Row(18, 82.3, 3.1),
        Row(21, 85.1, 3.2), Row(24, 87.8, 3.4), Row(36, 96.1, 3.9), Row(48, 103.3, 4.3),
        Row(60, 110.0, 4.8), Row(72, 116.0, 5.2)
    )
    private val girlsHeight = listOf(
        Row(0, 49.1, 1.9), Row(1, 53.7, 2.0), Row(2, 57.1, 2.1), Row(3, 59.8, 2.2), Row(4, 62.1, 2.3),
        Row(5, 64.0, 2.4), Row(6, 65.7, 2.4), Row(7, 67.3, 2.5), Row(8, 68.7, 2.5), Row(9, 70.1, 2.6),
        Row(10, 71.5, 2.6), Row(11, 72.8, 2.7), Row(12, 74.0, 2.8), Row(15, 77.5, 3.0), Row(18, 80.7, 3.1),
        Row(21, 83.7, 3.3), Row(24, 86.4, 3.4), Row(36, 95.1, 3.9), Row(48, 102.7, 4.4),
        Row(60, 109.4, 4.9), Row(72, 115.0, 5.3)
    )
    private val boysWeight = listOf(
        Row(0, 3.3, 0.45), Row(1, 4.5, 0.6), Row(2, 5.6, 0.7), Row(3, 6.4, 0.8), Row(4, 7.0, 0.85),
        Row(5, 7.5, 0.9), Row(6, 7.9, 0.95), Row(7, 8.3, 1.0), Row(8, 8.6, 1.0), Row(9, 8.9, 1.05),
        Row(10, 9.2, 1.05), Row(11, 9.4, 1.1), Row(12, 9.6, 1.1), Row(15, 10.3, 1.2), Row(18, 10.9, 1.25),
        Row(21, 11.5, 1.3), Row(24, 12.2, 1.4), Row(36, 14.3, 1.7), Row(48, 16.3, 2.0),
        Row(60, 18.3, 2.4), Row(72, 20.5, 2.9)
    )
    private val girlsWeight = listOf(
        Row(0, 3.2, 0.42), Row(1, 4.2, 0.55), Row(2, 5.1, 0.65), Row(3, 5.8, 0.72), Row(4, 6.4, 0.8),
        Row(5, 6.9, 0.85), Row(6, 7.3, 0.9), Row(7, 7.6, 0.95), Row(8, 7.9, 1.0), Row(9, 8.2, 1.0),
        Row(10, 8.5, 1.05), Row(11, 8.7, 1.05), Row(12, 8.9, 1.1), Row(15, 9.6, 1.2), Row(18, 10.2, 1.25),
        Row(21, 10.9, 1.3), Row(24, 11.5, 1.4), Row(36, 13.9, 1.7), Row(48, 16.1, 2.1),
        Row(60, 18.2, 2.6), Row(72, 20.2, 3.0)
    )

    private fun table(gender: Gender, metric: GrowthMetric): List<Row> = when (metric) {
        GrowthMetric.HEIGHT -> if (gender == Gender.BOY) boysHeight else girlsHeight
        GrowthMetric.WEIGHT -> if (gender == Gender.BOY) boysWeight else girlsWeight
    }

    private fun interpolate(rows: List<Row>, ageMonths: Double): Pair<Double, Double> {
        val a = ageMonths.coerceIn(0.0, rows.last().month.toDouble())
        val upperIdx = rows.indexOfFirst { it.month >= a }.let { if (it < 0) rows.lastIndex else it }
        if (upperIdx == 0) return rows[0].median to rows[0].sd
        val lo = rows[upperIdx - 1]
        val hi = rows[upperIdx]
        val t = if (hi.month == lo.month) 0.0 else (a - lo.month) / (hi.month - lo.month)
        return (lo.median + (hi.median - lo.median) * t) to (lo.sd + (hi.sd - lo.sd) * t)
    }

    fun median(gender: Gender, metric: GrowthMetric, ageMonths: Double): Double =
        interpolate(table(gender, metric), ageMonths).first

    fun zScore(gender: Gender, metric: GrowthMetric, ageMonths: Double, value: Double): Double {
        val (med, sd) = interpolate(table(gender, metric), ageMonths)
        return (value - med) / sd
    }

    fun percentile(gender: Gender, metric: GrowthMetric, ageMonths: Double, value: Double): Double =
        normalCdf(zScore(gender, metric, ageMonths, value)) * 100.0

    /** 해당 월령에서 +- z 표준편차에 해당하는 값 */
    fun bandValue(gender: Gender, metric: GrowthMetric, ageMonths: Double, z: Double): Double {
        val (med, sd) = interpolate(table(gender, metric), ageMonths)
        return med + sd * z
    }

    fun curve(gender: Gender, metric: GrowthMetric, maxMonths: Int, z: Double): List<Pair<Float, Float>> {
        val out = mutableListOf<Pair<Float, Float>>()
        var m = 0
        while (m <= maxMonths) {
            out += m.toFloat() to bandValue(gender, metric, m.toDouble(), z).toFloat()
            m += if (maxMonths > 36) 3 else 1
        }
        return out
    }

    fun describe(percentile: Double): String = when {
        percentile < 3 -> "또래보다 많이 작은 편이에요. 소아과 상담을 권해요."
        percentile < 15 -> "또래보다 조금 작은 편이에요."
        percentile <= 85 -> "또래와 비슷한 평균 범위예요."
        percentile <= 97 -> "또래보다 조금 큰 편이에요."
        else -> "또래보다 많이 큰 편이에요. 소아과 상담을 권해요."
    }

    // 표준정규분포 누적분포 (Abramowitz-Stegun 근사)
    private fun normalCdf(z: Double): Double {
        val t = 1.0 / (1.0 + 0.2316419 * abs(z))
        val d = 0.3989423 * exp(-z * z / 2.0)
        val p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
        return if (z > 0) 1.0 - p else p
    }

    /** BMI */
    fun bmi(heightCm: Double, weightKg: Double): Double {
        val m = heightCm / 100.0
        return if (m <= 0) 0.0 else weightKg / (m * m)
    }

    /** 키 예측(단순 평균 부모키 공식) */
    fun predictedAdultHeight(fatherCm: Double, motherCm: Double, gender: Gender): Double =
        if (gender == Gender.BOY) (fatherCm + motherCm + 13) / 2 else (fatherCm + motherCm - 13) / 2

    fun sd(values: List<Double>): Double {
        if (values.size < 2) return 0.0
        val mean = values.average()
        return sqrt(values.sumOf { (it - mean) * (it - mean) } / (values.size - 1))
    }
}
