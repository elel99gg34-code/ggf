package com.momcare.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

data class ChartSeries(
    val name: String,
    val points: List<Pair<Float, Float>>,
    val color: Color,
    val dashed: Boolean = false,
    val showDots: Boolean = true,
    val strokeWidth: Float = 3f
)

data class BarItem(val label: String, val value: Float, val color: Color? = null)

/** 간단한 다중 라인 차트 (x: 숫자, y: 숫자) */
@Composable
fun LineChart(
    series: List<ChartSeries>,
    modifier: Modifier = Modifier,
    xLabel: (Float) -> String = { it.toInt().toString() },
    yLabel: (Float) -> String = { "%.1f".format(it) },
    height: Int = 220
) {
    val measurer = rememberTextMeasurer()
    val axisColor = MaterialTheme.colorScheme.outline
    val textColor = MaterialTheme.colorScheme.onSurfaceVariant
    val allPoints = series.flatMap { it.points }
    if (allPoints.isEmpty()) {
        Box(modifier.fillMaxWidth().height(height.dp), contentAlignment = Alignment.Center) {
            Text("데이터가 없어요", color = textColor)
        }
        return
    }
    val minX = allPoints.minOf { it.first }
    val maxX = max(allPoints.maxOf { it.first }, minX + 1f)
    val rawMinY = allPoints.minOf { it.second }
    val rawMaxY = allPoints.maxOf { it.second }
    val pad = max((rawMaxY - rawMinY) * 0.1f, 0.5f)
    val minY = floor(rawMinY - pad)
    val maxY = ceil(rawMaxY + pad).let { if (it <= minY) minY + 1f else it }

    Canvas(modifier.fillMaxWidth().height(height.dp)) {
        val left = 44.dp.toPx()
        val bottom = 24.dp.toPx()
        val top = 8.dp.toPx()
        val right = 8.dp.toPx()
        val w = size.width - left - right
        val h = size.height - top - bottom
        val labelStyle = TextStyle(fontSize = 10.sp, color = textColor)

        fun px(x: Float) = left + (x - minX) / (maxX - minX) * w
        fun py(y: Float) = top + h - (y - minY) / (maxY - minY) * h

        // 가로 격자 + y 라벨
        val ySteps = 4
        for (i in 0..ySteps) {
            val v = minY + (maxY - minY) * i / ySteps
            val y = py(v)
            drawLine(axisColor.copy(alpha = 0.5f), Offset(left, y), Offset(left + w, y), strokeWidth = 1f)
            val layout = measurer.measure(yLabel(v), labelStyle)
            drawText(layout, topLeft = Offset(left - layout.size.width - 6.dp.toPx(), y - layout.size.height / 2f))
        }
        // x 라벨
        val xSteps = min(5, max(1, (maxX - minX).toInt()))
        for (i in 0..xSteps) {
            val v = minX + (maxX - minX) * i / xSteps
            val layout = measurer.measure(xLabel(v), labelStyle)
            drawText(layout, topLeft = Offset(px(v) - layout.size.width / 2f, top + h + 4.dp.toPx()))
        }
        // 선
        series.forEach { s ->
            if (s.points.isEmpty()) return@forEach
            val sorted = s.points.sortedBy { it.first }
            val path = Path()
            sorted.forEachIndexed { i, p ->
                val x = px(p.first)
                val y = py(p.second)
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            drawPath(
                path, s.color,
                style = Stroke(
                    width = s.strokeWidth.dp.toPx(), cap = StrokeCap.Round,
                    pathEffect = if (s.dashed) androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(14f, 10f)) else null
                )
            )
            if (s.showDots) {
                sorted.forEach { p -> drawCircle(s.color, 4.dp.toPx(), Offset(px(p.first), py(p.second))) }
            }
        }
    }
    // 범례
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        series.filter { it.name.isNotBlank() }.forEach { s ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(10.dp).clip(CircleShape).background(s.color))
                Spacer(Modifier.width(4.dp))
                Text(s.name, style = MaterialTheme.typography.bodySmall, color = textColor)
            }
        }
    }
}

/** 단순 막대 차트 */
@Composable
fun BarChart(
    items: List<BarItem>,
    modifier: Modifier = Modifier,
    valueLabel: (Float) -> String = { it.toInt().toString() },
    defaultColor: Color = MaterialTheme.colorScheme.primary,
    height: Int = 160
) {
    val measurer = rememberTextMeasurer()
    val textColor = MaterialTheme.colorScheme.onSurfaceVariant
    if (items.isEmpty()) return
    val maxV = max(items.maxOf { it.value }, 1f)

    Canvas(modifier.fillMaxWidth().height(height.dp)) {
        val bottom = 22.dp.toPx()
        val top = 18.dp.toPx()
        val h = size.height - bottom - top
        val slot = size.width / items.size
        val barW = slot * 0.55f
        val labelStyle = TextStyle(fontSize = 10.sp, color = textColor)
        items.forEachIndexed { i, item ->
            val barH = item.value / maxV * h
            val x = slot * i + (slot - barW) / 2f
            val y = top + h - barH
            drawRoundRect(
                item.color ?: defaultColor,
                topLeft = Offset(x, y),
                size = Size(barW, max(barH, 1f)),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx())
            )
            if (item.value > 0f) {
                val v = measurer.measure(valueLabel(item.value), labelStyle)
                drawText(v, topLeft = Offset(x + barW / 2f - v.size.width / 2f, y - v.size.height - 2.dp.toPx()))
            }
            val l = measurer.measure(item.label, labelStyle)
            drawText(l, topLeft = Offset(slot * i + slot / 2f - l.size.width / 2f, top + h + 4.dp.toPx()))
        }
    }
}

/** 가로 진행 막대 */
@Composable
fun ProgressBar(fraction: Float, modifier: Modifier = Modifier, color: Color = MaterialTheme.colorScheme.primary, height: Int = 10) {
    val track = MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)
    Canvas(modifier.fillMaxWidth().height(height.dp)) {
        val r = androidx.compose.ui.geometry.CornerRadius(size.height / 2f)
        drawRoundRect(track, size = size, cornerRadius = r)
        val f = fraction.coerceIn(0f, 1f)
        if (f > 0f) drawRoundRect(color, size = Size(size.width * f, size.height), cornerRadius = r)
    }
}

/** 원형 도넛 비율 차트 */
@Composable
fun DonutChart(
    slices: List<Pair<String, Float>>,
    colors: List<Color>,
    modifier: Modifier = Modifier,
    size: Int = 140
) {
    val total = slices.sumOf { it.second.toDouble() }.toFloat()
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Canvas(Modifier.size(size.dp)) {
            if (total <= 0f) {
                drawArc(Color.LightGray, 0f, 360f, false, style = Stroke(22.dp.toPx()))
                return@Canvas
            }
            var start = -90f
            slices.forEachIndexed { i, s ->
                val sweep = s.second / total * 360f
                drawArc(
                    colors[i % colors.size], start, sweep - 1.5f, false,
                    topLeft = Offset(14.dp.toPx(), 14.dp.toPx()),
                    size = Size(this.size.width - 28.dp.toPx(), this.size.height - 28.dp.toPx()),
                    style = Stroke(22.dp.toPx())
                )
                start += sweep
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            slices.forEachIndexed { i, s ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(10.dp).clip(CircleShape).background(colors[i % colors.size]))
                    Spacer(Modifier.width(6.dp))
                    val pct = if (total > 0) (s.second / total * 100).toInt() else 0
                    Text("${s.first} $pct%", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}
