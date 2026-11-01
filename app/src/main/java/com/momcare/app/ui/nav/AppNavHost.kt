package com.momcare.app.ui.nav

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.momcare.app.ui.RootViewModel
import com.momcare.app.ui.components.EmptyState
import com.momcare.app.ui.components.LocalChild
import com.momcare.app.ui.components.LocalChildren
import com.momcare.app.ui.components.MomScaffold
import com.momcare.app.ui.screens.*

@Composable
fun AppNavHost(root: RootViewModel, initialRoute: String?, onRouteHandled: () -> Unit) {
    val nav = rememberNavController()
    val children by root.children.collectAsState()
    val selectedId by root.selectedChildId.collectAsState()
    val visibility by root.visibility.collectAsState()
    // 아이 기능이 꺼져 있으면 아이 정보 자체를 화면에 전달하지 않는다 (비공개)
    val current = if (visibility.child) root.resolveSelected(children, selectedId) else null
    val shownChildren = if (visibility.child) children else emptyList()

    // 알림을 눌러 들어온 경우 해당 화면으로 이동 (비공개 기능이면 무시)
    LaunchedEffect(initialRoute) {
        if (initialRoute != null) {
            if (Features.isAllowed(initialRoute, visibility)) runCatching { nav.navigate(initialRoute) }
            onRouteHandled()
        }
    }

    CompositionLocalProvider(LocalChild provides current, LocalChildren provides shownChildren) {
        NavHost(navController = nav, startDestination = Routes.HOME) {
            composable(Routes.HOME) { HomeScreen(nav, root) }
            composable(Routes.SETTINGS) { SettingsScreen(nav) }
            composable(Routes.LOGIN) { LoginScreen(nav) }
            composable(Routes.SIGNUP) { SignupScreen(nav) }

            // 항상 공개
            screen(Routes.COUNSEL, nav, root) { CounselHomeScreen(nav) }
            screen(Routes.COUNSEL_ALARM, nav, root) { CounselAlarmScreen(nav) }
            screen(Routes.COUNSEL_JOURNAL, nav, root) { CounselJournalScreen(nav) }
            composable(
                Routes.COUNSEL_SKILL,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { entry -> CounselSkillScreen(nav, entry.arguments?.getString("id").orEmpty()) }
            screen(Routes.MOM_MIND, nav, root) { MomMindScreen(nav) }
            screen(Routes.SELF_CARE, nav, root) { SelfCareScreen(nav) }
            screen(Routes.WHITE_NOISE, nav, root) { WhiteNoiseScreen(nav) }
            screen(Routes.DIARY, nav, root) { DiaryScreen(nav) }
            screen(Routes.CALENDAR, nav, root) { CalendarScreen(nav) }
            screen(Routes.TODO, nav, root) { TodoScreen(nav) }
            screen(Routes.SHOPPING, nav, root) { ShoppingScreen(nav) }
            screen(Routes.MEAL_PLAN, nav, root) { MealPlanScreen(nav) }
            screen(Routes.RECIPE, nav, root) { RecipeScreen(nav) }
            screen(Routes.EXPENSE, nav, root) { ExpenseScreen(nav) }
            screen(Routes.SUPPLY, nav, root) { SupplyScreen(nav) }
            screen(Routes.ANNIVERSARY, nav, root) { AnniversaryScreen(nav) }
            screen(Routes.APPOINTMENT, nav, root) { AppointmentScreen(nav) }
            screen(Routes.EMERGENCY, nav, root) { EmergencyScreen(nav) }

            // 임신·출산 (비공개)
            screen(Routes.PREGNANCY, nav, root) { PregnancyScreen(nav) }
            screen(Routes.CONTRACTION, nav, root) { ContractionScreen(nav) }

            // 아이 관련 (비공개)
            screen(Routes.CHILDREN, nav, root) { ChildrenScreen(nav, root) }
            screen(Routes.FEEDING, nav, root) { FeedingScreen(nav) }
            screen(Routes.SOLID, nav, root) { SolidFoodScreen(nav) }
            screen(Routes.SLEEP, nav, root) { SleepScreen(nav) }
            screen(Routes.DIAPER, nav, root) { DiaperScreen(nav) }
            screen(Routes.PATTERN, nav, root) { PatternScreen(nav) }
            screen(Routes.REPORT, nav, root) { ReportScreen(nav) }
            screen(Routes.GROWTH, nav, root) { GrowthScreen(nav) }
            screen(Routes.GROWTH_COMPARE, nav, root) { GrowthCompareScreen(nav) }
            screen(Routes.VACCINE, nav, root) { VaccineScreen(nav) }
            screen(Routes.HEALTH, nav, root) { HealthScreen(nav) }
            screen(Routes.MEDICATION, nav, root) { MedicationScreen(nav) }
            screen(Routes.ALLERGY, nav, root) { AllergyScreen(nav) }
            screen(Routes.MILESTONE, nav, root) { MilestoneScreen(nav) }
            screen(Routes.CRY_HELPER, nav, root) { CryHelperScreen(nav) }
            screen(Routes.HABIT, nav, root) { HabitScreen(nav) }
            screen(Routes.REWARD, nav, root) { RewardScreen(nav) }
            screen(Routes.BOOK, nav, root) { BookScreen(nav) }
            screen(Routes.SCHOOL, nav, root) { SchoolScreen(nav) }
            screen(Routes.PLAY, nav, root) { PlayScreen(nav) }
            screen(Routes.TIPS, nav, root) { TipsScreen(nav) }
            screen(Routes.SAFETY, nav, root) { SafetyScreen(nav) }
            screen(Routes.OUTING, nav, root) { OutingScreen(nav) }
            screen(Routes.HANDOVER, nav, root) { HandoverScreen(nav) }
            screen(Routes.GEAR, nav, root) { GearScreen(nav) }
        }
    }
}

/** 비공개 설정을 확인한 뒤 화면을 보여주는 목적지 등록 헬퍼 */
private fun NavGraphBuilder.screen(
    route: String,
    nav: NavController,
    root: RootViewModel,
    content: @Composable () -> Unit
) {
    composable(route) {
        // 그래프에 상태를 캡처하지 않고 화면 안에서 최신 설정을 읽는다
        val v by root.visibility.collectAsState()
        if (Features.isAllowed(route, v)) content() else HiddenFeature(nav)
    }
}

@Composable
private fun HiddenFeature(nav: NavController) {
    MomScaffold("비공개 기능", nav) {
        EmptyState("🔒", "숨겨진 기능이에요", "설정 > 기능 표시에서 켜면 사용할 수 있어요.")
    }
}
