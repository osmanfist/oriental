/**
 * Oriental v3.0 - Task Manager (Fixed)
 */

class TaskManager {
    async createTask(taskData) {
        if (!app.state.currentProject) {
            showToast('Please select a project first', 'warning');
            return null;
        }

        try {
            const task = {
                title: taskData.title,
                description: taskData.description || '',
                status: taskData.status || 'planned',
                priority: taskData.priority || 'medium',
                assignedToId: taskData.assignedToId || null,
                assignedTo: taskData.assignedTo || null,
                dueDate: taskData.dueDate || null,
                estimatedHours: parseFloat(taskData.estimatedHours) || 0,
                tags: taskData.tags || [],
                projectId: app.state.currentProject.id,
                organizationId: app.state.currentOrganization,
                createdBy: auth.currentUser?.uid || authManager?.getCurrentUser()?.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                subtaskCount: 0,
                completedSubtasks: 0,
                progress: 0,
                order: Date.now()
            };

            const docRef = await db.collection('tasks').add(task);
            
            // Save to localDB
            try {
                await localDB.put('tasks', { id: docRef.id, ...task });
            } catch (e) {}

            // Create subtasks if provided
            if (taskData.subtasks?.length) {
                await this.createSubtasks(docRef.id, taskData.subtasks);
            }

            showToast('Task created!', 'success');
            await app.modules.board?.render();
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating task:', error);
            showToast('Error creating task', 'error');
            return null;
        }
    }

    async updateTask(taskId, updates) {
        try {
            await db.collection('tasks').doc(taskId).update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast('Task updated', 'success');
            await app.modules.board?.render();
            return true;
        } catch (error) {
            console.error('Error updating task:', error);
            showToast('Error updating task', 'error');
            return false;
        }
    }

    async deleteTask(taskId) {
        try {
            // Delete subtasks
            const subtasksSnapshot = await db.collection('subtasks')
                .where('parentTaskId', '==', taskId).get();
            const batch = db.batch();
            subtasksSnapshot.forEach(doc => batch.delete(doc.ref));
            batch.delete(db.collection('tasks').doc(taskId));
            await batch.commit();
            
            showToast('Task deleted', 'success');
            await app.modules.board?.render();
            return true;
        } catch (error) {
            console.error('Error deleting task:', error);
            showToast('Error deleting task', 'error');
            return false;
        }
    }

    async createSubtasks(parentTaskId, subtasks) {
        const batch = db.batch();
        for (let i = 0; i < subtasks.length; i++) {
            const subtaskRef = db.collection('subtasks').doc();
            batch.set(subtaskRef, {
                parentTaskId,
                title: subtasks[i].title,
                description: subtasks[i].description || '',
                status: subtasks[i].status || 'planned',
                assignedToId: subtasks[i].assignedToId || null,
                assignedTo: subtasks[i].assignedTo || null,
                projectId: app.state.currentProject.id,
                organizationId: app.state.currentOrganization,
                createdBy: auth.currentUser?.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                order: i
            });
        }
        await batch.commit();
        
        // Update parent task counts
        await this.updateParentProgress(parentTaskId);
    }

    async updateSubtask(subtaskId, updates) {
        try {
            await db.collection('subtasks').doc(subtaskId).update(updates);
            
            // Update parent progress
            const subtaskDoc = await db.collection('subtasks').doc(subtaskId).get();
            if (subtaskDoc.exists) {
                await this.updateParentProgress(subtaskDoc.data().parentTaskId);
            }
            return true;
        } catch (error) {
            console.error('Error updating subtask:', error);
            return false;
        }
    }

    async updateParentProgress(parentTaskId) {
        try {
            const snapshot = await db.collection('subtasks')
                .where('parentTaskId', '==', parentTaskId).get();
            
            const total = snapshot.size;
            const completed = snapshot.docs.filter(d => d.data().status === 'completed').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            await db.collection('tasks').doc(parentTaskId).update({
                subtaskCount: total,
                completedSubtasks: completed,
                progress: progress,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn('Could not update parent progress:', error);
        }
    }

    async getSubtasks(parentTaskId) {
        try {
            const snapshot = await db.collection('subtasks')
                .where('parentTaskId', '==', parentTaskId)
                .orderBy('order', 'asc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            return [];
        }
    }

    async getTaskHistory(taskId) {
        try {
            const snapshot = await db.collection('task_history')
                .where('taskId', '==', taskId)
                .orderBy('createdAt', 'desc').limit(20).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            return [];
        }
    }
}