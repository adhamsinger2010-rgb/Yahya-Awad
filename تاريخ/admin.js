// حماية لوحة التحكم بكلمة سر
const ADMIN_PASSCODE = "2352010"; // غيّر كلمة السر دي للكود اللي تحبه

(function checkAdminAuth() {
    const enteredCode = prompt("برجاء إدخال كود دخول لوحة التحكم الخاصة بالأستاذ:");
    if (enteredCode !== ADMIN_PASSCODE) {
        alert("كود الدخول غير صحيح!");
        window.location.href = "index.html"; // إعادة توجيه الطالب لصفحة الدخول العادية
    }
})();

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAwcKOpi702QHV3xYZh4UksXNlfazhB2g",
    authDomain: "teacher-platform-b2f06.firebaseapp.com",
    projectId: "teacher-platform-b2f06",
    storageBucket: "teacher-platform-b2f06.firebasestorage.app",
    messagingSenderId: "516331431547",
    appId: "1:516331431547:web:b1f4ca7b10f0e1b7c64de",
    measurementId: "G-SEKXR9CWHB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.openStudentsModal = function() { document.getElementById('studentsModal').style.display = 'flex'; };
window.closeStudentsModal = function() { document.getElementById('studentsModal').style.display = 'none'; };

window.addUser = async function() {
    const username = document.getElementById('new-username').value.trim();
    const code = document.getElementById('new-code').value.trim();
    const msg = document.getElementById('add-user-msg');

    if (!username || !code) {
        msg.style.color = "#ef4444";
        msg.innerText = "أدخل اسم الطالب والكود معاً!";
        return;
    }

    try {
        await setDoc(doc(db, "students", username), { code: code });
        msg.style.color = "#22c55e";
        msg.innerText = "تمت إضافة الطالب بنجاح!";
        document.getElementById('new-username').value = '';
        document.getElementById('new-code').value = '';
        setTimeout(() => msg.innerText = '', 3000);
    } catch (e) {
        console.error(e);
    }
};

window.deleteUser = async function(username) {
    if (confirm(`حذف حساب الطالب: ${username}؟`)) {
        await deleteDoc(doc(db, "students", username));
    }
};

onSnapshot(collection(db, "students"), (snapshot) => {
    const container = document.getElementById('users-list');
    container.innerHTML = '';
    snapshot.forEach((docSnap) => {
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; padding:12px 16px; margin-bottom:10px; border-radius:10px; border:1px solid #334155;">
                <div>
                    <b style="color:#f8fafc; font-size:15px;"><i class="fa-solid fa-user-check" style="color:#38bdf8; margin-left:6px;"></i> ${docSnap.id}</b>
                    <span style="color:#64748b; margin: 0 10px;">|</span>
                    <span style="color:#a78bfa; font-size:13px;">كود الدخول: <b>${docSnap.data().code}</b></span>
                </div>
                <button class="btn-danger-glow" style="padding:6px 12px; font-size:12px;" onclick="deleteUser('${docSnap.id}')">حذف الطالب</button>
            </div>
        `;
    });
});

window.addCourse = async function() {
    const title = document.getElementById('course-title').value.trim();
    const desc = document.getElementById('course-desc').value.trim();

    if (!title) { alert("أدخل عنوان الوحدة!"); return; }

    const courseId = "course_" + Date.now();
    await setDoc(doc(db, "courses", courseId), {
        title: title,
        description: desc,
        videos: [],
        homeworks: []
    });

    document.getElementById('course-title').value = '';
    document.getElementById('course-desc').value = '';
};

window.deleteCourse = async function(courseId) {
    if (confirm("هل أنت متأكد من حذف هذه الوحدة بالكامل؟")) {
        await deleteDoc(doc(db, "courses", courseId));
    }
};

window.addVideoToCourse = async function(courseId) {
    const title = document.getElementById(`v-title-${courseId}`).value.trim();
    let url = document.getElementById(`v-url-${courseId}`).value.trim();

    if (!title || !url) { alert("أدخل البيانات كاملة!"); return; }

    if (url.includes("watch?v=")) url = url.replace("watch?v=", "embed/");
    else if (url.includes("youtu.be/")) url = url.replace("youtu.be/", "www.youtube.com/embed/");
    
    if (!url.includes("rel=0")) {
        url += (url.includes("?") ? "&" : "?") + "rel=0";
    }

    await updateDoc(doc(db, "courses", courseId), {
        videos: arrayUnion({ title: title, url: url })
    });

    document.getElementById(`v-title-${courseId}`).value = '';
    document.getElementById(`v-url-${courseId}`).value = '';
};

window.deleteVideo = async function(courseId, videoObj) {
    await updateDoc(doc(db, "courses", courseId), {
        videos: arrayRemove(videoObj)
    });
};

window.addHomeworkToCourse = async function(courseId) {
    const title = document.getElementById(`hw-title-${courseId}`).value.trim();
    const url = document.getElementById(`hw-url-${courseId}`).value.trim();
    const answersText = document.getElementById(`hw-answers-${courseId}`).value.trim();

    if (!title || !url) { alert("أدخل بيانات الواجب ورابط الـ PDF!"); return; }

    const modelAnswers = answersText ? answersText.split(',').map(a => a.trim()) : [];

    await updateDoc(doc(db, "courses", courseId), {
        homeworks: arrayUnion({ 
            title: title, 
            url: url, 
            questionCount: modelAnswers.length || 5,
            modelAnswers: modelAnswers 
        })
    });

    document.getElementById(`hw-title-${courseId}`).value = '';
    document.getElementById(`hw-url-${courseId}`).value = '';
    document.getElementById(`hw-answers-${courseId}`).value = '';
};

window.deleteHomework = async function(courseId, hwObj) {
    await updateDoc(doc(db, "courses", courseId), {
        homeworks: arrayRemove(hwObj)
    });
};

onSnapshot(collection(db, "courses"), (snapshot) => {
    const container = document.getElementById('admin-courses-list');
    container.innerHTML = '';

    snapshot.forEach((docSnap) => {
        const course = docSnap.data();
        const courseId = docSnap.id;
        let vHtml = '', hHtml = '';

        if (course.videos) {
            course.videos.forEach((vid) => {
                const json = JSON.stringify(vid).replace(/"/g, '&quot;');
                vHtml += `<div class="item-row" style="margin-top:8px;"><span>${vid.title}</span><button class="btn-danger-glow" onclick="deleteVideo('${courseId}', ${json})">حذف</button></div>`;
            });
        }

        if (course.homeworks) {
            course.homeworks.forEach((hw) => {
                const json = JSON.stringify(hw).replace(/"/g, '&quot;');
                hHtml += `<div class="item-row" style="margin-top:8px;"><span>${hw.title} (${hw.questionCount} أسئلة)</span><button class="btn-danger-glow" onclick="deleteHomework('${courseId}', ${json})">حذف</button></div>`;
            });
        }

        container.innerHTML += `
            <div style="background:rgba(30,41,59,0.5); padding:22px; border-radius:16px; border:1px solid #334155; margin-bottom:25px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color:#f8fafc; font-size:18px;"><i class="fa-solid fa-folder" style="color:#38bdf8;"></i> ${course.title}</h3>
                    <button class="btn-danger-glow" onclick="deleteCourse('${courseId}')">حذف الوحدة بالكامل</button>
                </div>
                <p style="color:#94a3b8; font-size:13px; margin-top:6px; margin-bottom:18px;">${course.description || ''}</p>
                
                <div style="background: rgba(15, 23, 42, 0.6); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #1e293b;">
                    <b style="color:#a78bfa; display:block; margin-bottom:10px;">+ إضافة محاضرة / فيديو:</b>
                    <div style="display:grid; grid-template-columns:1fr 1.5fr auto; gap:10px;">
                        <input type="text" id="v-title-${courseId}" placeholder="عنوان المحاضرة">
                        <input type="text" id="v-url-${courseId}" placeholder="رابط يوتيوب">
                        <button class="btn-glow" style="padding:10px 18px;" onclick="addVideoToCourse('${courseId}')">إضافة الفيديو</button>
                    </div>
                    ${vHtml}
                </div>

                <div style="background: rgba(15, 23, 42, 0.6); padding: 15px; border-radius: 12px; border: 1px solid #1e293b;">
                    <b style="color:#38bdf8; display:block; margin-bottom:10px;">+ إضافة امتحان PDF مع إجابات التصحيح التلقائي:</b>
                    <div style="display:grid; grid-template-columns:1fr 1.5fr 1fr auto; gap:10px;">
                        <input type="text" id="hw-title-${courseId}" placeholder="عنوان الامتحان">
                        <input type="text" id="hw-url-${courseId}" placeholder="رابط PDF من Google Drive">
                        <input type="text" id="hw-answers-${courseId}" placeholder="الإجابات (مثال: أ,ب,ج,د,أ)">
                        <button class="btn-glow" style="padding:10px 18px; background:linear-gradient(135deg, #0284c7, #0369a1);" onclick="addHomeworkToCourse('${courseId}')">إضافة الامتحان</button>
                    </div>
                    ${hHtml}
                </div>
            </div>
        `;
    });
});