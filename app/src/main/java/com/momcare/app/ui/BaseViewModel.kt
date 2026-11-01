package com.momcare.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.momcare.app.MomCareApp
import com.momcare.app.data.AppDatabase
import com.momcare.app.data.Prefs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** 모든 ViewModel 의 공통 베이스. DB/설정 접근과 선택된 아이 기반 Flow 헬퍼를 제공한다. */
abstract class BaseViewModel(app: Application) : AndroidViewModel(app) {
    protected val context: Application = app
    protected val container = (app as MomCareApp).container
    protected val db: AppDatabase get() = container.db
    val prefs: Prefs get() = container.prefs

    val selectedChildId: StateFlow<Long> get() = prefs.selectedChildId

    protected fun io(block: suspend CoroutineScope.() -> Unit) {
        viewModelScope.launch(Dispatchers.IO, block = block)
    }

    protected fun <T> Flow<T>.asState(initial: T): StateFlow<T> =
        stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), initial)

    /** 확장 함수(다른 파일)에서 사용할 수 있는 공개 버전 */
    fun <T> Flow<T>.stateInVm(initial: T): StateFlow<T> = asState(initial)

    @OptIn(ExperimentalCoroutinesApi::class)
    protected fun <T> forChild(initial: T, source: (Long) -> Flow<T>): StateFlow<T> =
        selectedChildId.flatMapLatest { source(it) }.asState(initial)
}
