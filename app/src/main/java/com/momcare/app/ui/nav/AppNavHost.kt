package com.momcare.app.ui.nav

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.momcare.app.ui.RootViewModel
import com.momcare.app.ui.components.LocalChild
import com.momcare.app.ui.components.LocalChildren
import com.momcare.app.ui.screens.AllergyScreen
import com.momcare.app.ui.screens.AnniversaryScreen
import com.momcare.app.ui.screens.AppointmentScreen
import com.momcare.app.ui.screens.CalendarScreen
import com.momcare.app.ui.screens.ChildrenScreen
import com.momcare.app.ui.screens.CounselAlarmScreen
import com.momcare.app.ui.screens.CounselHomeScreen
import com.momcare.app.ui.screens.CounselJournalScreen
import com.momcare.app.ui.screens.CounselSkillScreen
import com.momcare.app.ui.screens.CryHelperScreen
import com.momcare.app.ui.screens.DiaperScreen
import com.momcare.app.ui.screens.DiaryScreen
import com.momcare.app.ui.screens.EmergencyScreen
import com.momcare.app.ui.screens.ExpenseScreen
import com.momcare.app.ui.screens.FeedingScreen
import com.momcare.app.ui.screens.GearScreen
import com.momcare.app.ui.screens.GrowthCompareScreen
import com.momcare.app.ui.screens.GrowthScreen
import com.momcare.app.ui.screens.HealthScreen
import com.momcare.app.ui.screens.HomeScreen
import com.momcare.app.ui.screens.MealPlanScreen
import com.momcare.app.ui.screens.MedicationScreen
import com.momcare.app.ui.screens.MilestoneScreen
import com.momcare.app.ui.screens.MomMindScreen
import com.momcare.app.ui.screens.PlayScreen
import com.momcare.app.ui.screens.ReportScreen
import com.momcare.app.ui.screens.RewardScreen
import com.momcare.app.ui.screens.SchoolScreen
import com.momcare.app.ui.screens.SelfCareScreen
import com.momcare.app.ui.screens.SettingsScreen
import com.momcare.app.ui.screens.ShoppingScreen
import com.momcare.app.ui.screens.SleepScreen
import com.momcare.app.ui.screens.SolidFoodScreen
import com.momcare.app.ui.screens.TipsScreen
import com.momcare.app.ui.screens.TodoScreen
import com.momcare.app.ui.screens.VaccineScreen
import com.momcare.app.ui.screens.WhiteNoiseScreen

@Composable
fun AppNavHost(root: RootViewModel, initialRoute: String?, onRouteHandled: () -> Unit) {
    val nav = rememberNavController()
    val children by root.children.collectAsState()
    val selectedId by root.selectedChildId.collectAsState()
    val current = root.resolveSelected(children, selectedId)

    // 알림을 눌러 들어온 경우 해당 화면으로 이동
    LaunchedEffect(initialRoute) {
        if (initialRoute != null) {
            runCatching { nav.navigate(initialRoute) }
            onRouteHandled()
        }
    }

    CompositionLocalProvider(LocalChild provides current, LocalChildren provides children) {
        NavHost(navController = nav, startDestination = Routes.HOME) {
            composable(Routes.HOME) { HomeScreen(nav, root) }
            composable(Routes.CHILDREN) { ChildrenScreen(nav, root) }
            composable(Routes.GROWTH) { GrowthScreen(nav) }
            composable(Routes.GROWTH_COMPARE) { GrowthCompareScreen(nav) }
            composable(Routes.VACCINE) { VaccineScreen(nav) }
            composable(Routes.FEEDING) { FeedingScreen(nav) }
            composable(Routes.SOLID) { SolidFoodScreen(nav) }
            composable(Routes.SLEEP) { SleepScreen(nav) }
            composable(Routes.DIAPER) { DiaperScreen(nav) }
            composable(Routes.HEALTH) { HealthScreen(nav) }
            composable(Routes.MEDICATION) { MedicationScreen(nav) }
            composable(Routes.APPOINTMENT) { AppointmentScreen(nav) }
            composable(Routes.MILESTONE) { MilestoneScreen(nav) }
            composable(Routes.DIARY) { DiaryScreen(nav) }
            composable(Routes.ANNIVERSARY) { AnniversaryScreen(nav) }
            composable(Routes.TODO) { TodoScreen(nav) }
            composable(Routes.SHOPPING) { ShoppingScreen(nav) }
            composable(Routes.MEAL_PLAN) { MealPlanScreen(nav) }
            composable(Routes.EXPENSE) { ExpenseScreen(nav) }
            composable(Routes.CALENDAR) { CalendarScreen(nav) }
            composable(Routes.ALLERGY) { AllergyScreen(nav) }
            composable(Routes.EMERGENCY) { EmergencyScreen(nav) }
            composable(Routes.WHITE_NOISE) { WhiteNoiseScreen(nav) }
            composable(Routes.CRY_HELPER) { CryHelperScreen(nav) }
            composable(Routes.MOM_MIND) { MomMindScreen(nav) }
            composable(Routes.SELF_CARE) { SelfCareScreen(nav) }
            composable(Routes.GEAR) { GearScreen(nav) }
            composable(Routes.SCHOOL) { SchoolScreen(nav) }
            composable(Routes.REWARD) { RewardScreen(nav) }
            composable(Routes.PLAY) { PlayScreen(nav) }
            composable(Routes.TIPS) { TipsScreen(nav) }
            composable(Routes.COUNSEL) { CounselHomeScreen(nav) }
            composable(Routes.COUNSEL_ALARM) { CounselAlarmScreen(nav) }
            composable(Routes.COUNSEL_JOURNAL) { CounselJournalScreen(nav) }
            composable(
                Routes.COUNSEL_SKILL,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { entry ->
                CounselSkillScreen(nav, entry.arguments?.getString("id").orEmpty())
            }
            composable(Routes.REPORT) { ReportScreen(nav) }
            composable(Routes.SETTINGS) { SettingsScreen(nav) }
        }
    }
}
