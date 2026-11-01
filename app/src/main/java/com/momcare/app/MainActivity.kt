package com.momcare.app

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import com.momcare.app.notif.Reminders
import com.momcare.app.ui.RootViewModel
import com.momcare.app.ui.nav.AppNavHost
import com.momcare.app.ui.screens.LockScreen
import com.momcare.app.ui.theme.MomCareTheme

class MainActivity : ComponentActivity() {

    private var pendingRoute by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        pendingRoute = intent?.getStringExtra(Reminders.EXTRA_ROUTE)?.takeIf { it.isNotBlank() }

        setContent {
            MomCareTheme {
                val root: RootViewModel = viewModel()
                val unlocked by root.unlocked.collectAsState()

                val permissionLauncher = rememberLauncherForActivityResult(
                    ActivityResultContracts.RequestPermission()
                ) { /* 결과와 상관없이 앱은 계속 동작 */ }

                LaunchedEffect(unlocked) {
                    if (unlocked && Build.VERSION.SDK_INT >= 33) {
                        permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }

                if (!unlocked) {
                    LockScreen(onUnlocked = { root.unlock() })
                } else {
                    val route = remember(pendingRoute) { pendingRoute }
                    AppNavHost(
                        root = root,
                        initialRoute = route,
                        onRouteHandled = { pendingRoute = null }
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingRoute = intent.getStringExtra(Reminders.EXTRA_ROUTE)?.takeIf { it.isNotBlank() }
    }
}
