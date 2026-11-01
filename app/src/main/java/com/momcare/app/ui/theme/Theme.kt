package com.momcare.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.shape.RoundedCornerShape

val Rose = Color(0xFFF2708E)
val RoseDark = Color(0xFFD9507A)
val RoseLight = Color(0xFFFFE3EA)
val Peach = Color(0xFFFFF1EA)
val Cream = Color(0xFFFFF8F5)
val Mint = Color(0xFF6BBF8A)
val Sky = Color(0xFF5B9BD5)
val Sun = Color(0xFFF5C451)
val Lavender = Color(0xFF9B7FD1)
val Orange = Color(0xFFF5A25D)
val Ink = Color(0xFF3B2F33)
val InkSoft = Color(0xFF7A6A70)

private val LightColors = lightColorScheme(
    primary = Rose,
    onPrimary = Color.White,
    primaryContainer = RoseLight,
    onPrimaryContainer = Color(0xFF5A1530),
    secondary = Lavender,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFEDE4FA),
    tertiary = Mint,
    background = Cream,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    surfaceVariant = Peach,
    onSurfaceVariant = InkSoft,
    outline = Color(0xFFE2D3D8),
    error = Color(0xFFD64545)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFFF9DB5),
    onPrimary = Color(0xFF4A0F26),
    primaryContainer = Color(0xFF6E2641),
    onPrimaryContainer = Color(0xFFFFD9E2),
    secondary = Color(0xFFCBB8F2),
    secondaryContainer = Color(0xFF4A3A70),
    tertiary = Color(0xFF8FD8A9),
    background = Color(0xFF1F1A1C),
    onBackground = Color(0xFFF1E4E8),
    surface = Color(0xFF2A2326),
    onSurface = Color(0xFFF1E4E8),
    surfaceVariant = Color(0xFF3A2F33),
    onSurfaceVariant = Color(0xFFD1BFC5),
    outline = Color(0xFF5C4B51),
    error = Color(0xFFFF8A8A)
)

private val AppTypography = Typography(
    headlineMedium = TextStyle(fontSize = 26.sp, fontWeight = FontWeight.Bold, lineHeight = 34.sp),
    titleLarge = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.Bold),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium)
)

private val AppShapes = Shapes(
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp)
)

@Composable
fun MomCareTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (dark) DarkColors else LightColors,
        typography = AppTypography,
        shapes = AppShapes,
        content = content
    )
}

/** 아이별 구분 색상 */
val ChildColors = listOf(Rose, Sky, Mint, Orange, Lavender, Sun)

fun childColor(index: Int): Color = ChildColors[index.mod(ChildColors.size)]
