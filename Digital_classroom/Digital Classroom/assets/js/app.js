async function bootDigitalClassroomPage() {
  ClassroomState.init();

  const page = document.body.dataset.page;
  const params = new URLSearchParams(window.location.search);
  const classroomId = params.get("classroomId") || params.get("id");

  try {
    const connectionStatus = await ClassroomAPI.getConnectionStatus?.();
    if (connectionStatus) {
      console.info("[Digital Classroom] Connection mode:", connectionStatus);
    }

    if (!["student", "join", "my-classes"].includes(page)) {
      ClassroomUI.mountShell(page);
    }

    if (page === "dashboard") {
      const authGate = await ClassroomAPI.getAuthGateState();
      if (authGate.loginRequired) {
        ClassroomAPI.storeReturnUrl(window.location.href);
        ClassroomUI.renderTeacherLoginRequired();
        return;
      }

      await ClassroomUI.renderTeacherDashboard();
    }

    if (page === "create") {
      await ClassroomUI.renderCreateClassroom();
    }

    if (page === "detail") {
      await ClassroomUI.renderClassroomDetail(classroomId);
    }

    if (page === "activity-hub") {
      await ClassroomUI.renderActivityHub(classroomId);
    }

    if (page === "teacher-resources") {
      await ClassroomUI.renderTeachingResources(classroomId);
    }

    if (page === "saved-collections") {
      await ClassroomUI.renderSavedCollections();
    }

    if (page === "student") {
      await ClassroomUI.renderStudentDashboard(classroomId);
    }

    if (page === "join") {
      await ClassroomUI.renderJoinClassroom(classroomId);
    }

    if (page === "my-classes") {
      await ClassroomUI.renderMyClasses();
    }
  } catch (error) {
    if (page === "dashboard" && /No active Edtechra session/i.test(error?.message || "")) {
      ClassroomAPI.storeReturnUrl(window.location.href);
      ClassroomUI.renderTeacherLoginRequired();
      return;
    }

    console.error("Digital Classroom failed to render.", error);
    const main = document.querySelector("main");
    if (main) {
      main.insertAdjacentHTML(
        "afterbegin",
        `<div class="notice error">Something went wrong while loading this page. Check the classroom link and try again.</div>`
      );
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootDigitalClassroomPage);
} else {
  bootDigitalClassroomPage();
}
