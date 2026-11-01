package com.momcare.app

import android.app.Application
import com.momcare.app.data.AppContainer
import com.momcare.app.notif.Reminders
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MomCareApp : Application() {
    lateinit var container: AppContainer
        private set

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        Reminders.ensureChannels(this)
        appScope.launch { Reminders.rescheduleAll(this@MomCareApp) }
    }
}
