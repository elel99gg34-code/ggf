package com.momcare.app.ui

import android.app.Application
import com.momcare.app.data.Child
import kotlinx.coroutines.flow.StateFlow

/** 앱 전역 상태: 잠금 해제 여부, 아이 목록, 선택된 아이 */
class RootViewModel(app: Application) : BaseViewModel(app) {

    val unlocked: StateFlow<Boolean> = prefs.unlocked

    val children: StateFlow<List<Child>> = db.childDao().observeAll().asState(emptyList())

    val momName: StateFlow<String> = prefs.momName

    fun unlock() = prefs.setUnlocked(true)

    fun select(id: Long) = prefs.setSelectedChild(id)

    /** 선택된 아이가 없거나 삭제되었으면 첫 번째 아이로 보정 */
    fun resolveSelected(list: List<Child>, selectedId: Long): Child? =
        list.firstOrNull { it.id == selectedId } ?: list.firstOrNull()
}
