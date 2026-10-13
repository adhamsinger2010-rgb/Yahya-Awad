import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let currentCourses = [];
let currentActiveCourse = null;

window.addEventListener('DOMContentLoaded', () => {
    const savedStudent = localStorage.getItem('current_student_session');
    if (savedStudent) {
        document.getElementById('welcome-user').innerText = `أهلاً بك يا ${savedStudent}`;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('platform-section').style.display = 'block';
        listenToCoursesRealtime();
    }
});

window.login = async function() {
    const username = document.getElementById('username').value.trim();
    const usercode = document.getElementById('usercode').value.trim();
    const errorMsg = document.getElementById('error-msg');

    if (!username || !usercode) {
        errorMsg.innerText = "برجاء كتابة اسم المستخدم وكود الدخول!";
        return;
    }

    try {
        const userDocRef = doc(db, "students", username);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists() && userSnap.data().code === usercode) {
            localStorage.setItem('current_student_session', username);
            document.getElementById('welcome-user').innerText = `أهلاً بك يا ${username}`;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('platform-section').style.display = 'block';
            listenToCoursesRealtime();
        } else {
            errorMsg.innerText = "اسم المستخدم أو كود الدخول غير صحيح!";
        }
    } catch (err) {
        console.error(err);
        errorMsg.innerText = "خطأ في الاتصال بالخادم، حاول مجدداً.";
    }
};

window.logout = function() {
    localStorage.removeItem('current_student_session');
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('platform-section').style.display = 'none';
    document.getElementById('video-player-section').style.display = 'none';
};

function listenToCoursesRealtime() {
    onSnapshot(collection(db, "courses"), (snapshot) => {
        currentCourses = [];
        snapshot.forEach((doc) => {
            currentCourses.push({ id: doc.id, ...doc.data() });
        });

        renderCoursesList();

        if (currentActiveCourse) {
            const updated = currentCourses.find(c => c.id === currentActiveCourse.id);
            if (updated) {
                currentActiveCourse = updated;
                renderPlaylist();
                renderHomeworks();
            }
        }
    });
}

function renderCoursesList() {
    const container = document.getElementById('courses-container');
    container.innerHTML = '';

    if (currentCourses.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8; grid-column: 1/-1; text-align:center;">لا توجد وحدات متاحة الآن.</p>';
        return;
    }

    currentCourses.forEach(course => {
        const videoCount = course.videos ? course.videos.length : 0;
        const hwCount = course.homeworks ? course.homeworks.length : 0;
        container.innerHTML += `
            <div class="course-card" onclick="openCourse('${course.id}')">
                <div class="card-tag"><i class="fa-solid fa-graduation-cap"></i> وحدة تعليمية</div>
                <h3>${course.title}</h3>
                <p>${course.description || 'شرح وتدريبات متكاملة'}</p>
                <div class="card-footer">
                    <span><i class="fa-solid fa-play"></i> ${videoCount} محاضرات</span>
                    <span><i class="fa-solid fa-file-pen"></i> ${hwCount} امتحانات</span>
                </div>
            </div>
        `;
    });
}

window.openCourse = function(courseId) {
    currentActiveCourse = currentCourses.find(c => c.id === courseId);
    if (!currentActiveCourse) return;

    document.getElementById('platform-section').style.display = 'none';
    document.getElementById('video-player-section').style.display = 'block';
    document.getElementById('current-course-title').innerText = currentActiveCourse.title;

    if (currentActiveCourse.videos && currentActiveCourse.videos.length > 0) {
        window.playVideo(0);
    } else {
        document.getElementById('main-video-frame').src = '';
    }

    renderHomeworks();
};

window.playVideo = function(index) {
    if (!currentActiveCourse || !currentActiveCourse.videos || !currentActiveCourse.videos[index]) return;
    const video = currentActiveCourse.videos[index];
    document.getElementById('main-video-frame').src = video.url;
    renderPlaylist(index);
};

function renderPlaylist(activeIndex = 0) {
    const container = document.getElementById('playlist-items');
    container.innerHTML = '';

    if (!currentActiveCourse.videos || currentActiveCourse.videos.length === 0) {
        container.innerHTML = '<p style="color:#64748b; font-size:13px;">لا توجد محاضرات في هذه الوحدة.</p>';
        return;
    }

    currentActiveCourse.videos.forEach((v, i) => {
        container.innerHTML += `
            <div class="playlist-item ${i === activeIndex ? 'active' : ''}" onclick="window.playVideo(${i})">
                <span><b>المحاضرة ${i + 1}:</b> ${v.title}</span>
                <i class="fa-solid fa-circle-play"></i>
            </div>
        `;
    });
}

function renderHomeworks() {
    const container = document.getElementById('homework-items');
    container.innerHTML = '';

    if (!currentActiveCourse.homeworks || currentActiveCourse.homeworks.length === 0) {
        container.innerHTML = '<p style="color:#64748b; font-size:13px;">لا توجد امتحانات مضافة لهذه الوحدة.</p>';
        return;
    }

    currentActiveCourse.homeworks.forEach((hw, index) => {
        const answersModel = hw.modelAnswers || [];
        const totalQ = answersModel.length > 0 ? answersModel.length : (hw.questionCount || 5);
        let questionsHtml = '';

        for (let q = 1; q <= totalQ; q++) {
            questionsHtml += `
                <div class="q-block">
                    <span class="q-title">السؤال ${q}:</span>
                    <div class="options-grid">
                        <label class="opt-btn"><input type="radio" name="q_${index}_${q}" value="أ"> <span>أ</span></label>
                        <label class="opt-btn"><input type="radio" name="q_${index}_${q}" value="ب"> <span>ب</span></label>
                        <label class="opt-btn"><input type="radio" name="q_${index}_${q}" value="ج"> <span>ج</span></label>
                        <label class="opt-btn"><input type="radio" name="q_${index}_${q}" value="د"> <span>د</span></label>
                    </div>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="exam-card">
                <div class="exam-header">
                    <h4><i class="fa-solid fa-file-pdf" style="color:#ef4444;"></i> ${hw.title}</h4>
                    <a href="${hw.url}" target="_blank" class="btn-pdf-download"><i class="fa-solid fa-file-arrow-down"></i> فتح/تحميل PDF</a>
                </div>
                <div class="q-list">${questionsHtml}</div>
                <button class="btn-submit-exam" onclick="submitAndGrade('${hw.title}', ${index}, ${totalQ})"><i class="fa-solid fa-check-double"></i> تسليم الامتحان والتصحيح الفوري</button>
                <div id="result-box-${index}" class="result-box"></div>
            </div>
        `;
    });
}

window.submitAndGrade = async function(title, hwIndex, totalQ) {
    const student = localStorage.getItem('current_student_session');
    const hwObj = currentActiveCourse.homeworks[hwIndex];
    const modelAnswers = hwObj.modelAnswers || [];

    let studentAnswers = {};
    let score = 0;

    for (let q = 1; q <= totalQ; q++) {
        const sel = document.querySelector(`input[name="q_${hwIndex}_${q}"]:checked`);
        if (!sel) {
            alert(`يرجى تحديد إجابة السؤال رقم ${q}`);
            return;
        }
        const val = sel.value;
        studentAnswers[`س_${q}`] = val;

        if (modelAnswers[q - 1] && modelAnswers[q - 1] === val) {
            score++;
        }
    }

    const percentage = Math.round((score / totalQ) * 100);
    const resultDiv = document.getElementById(`result-box-${hwIndex}`);
    
    resultDiv.style.display = "block";
    resultDiv.innerHTML = `
        <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; padding: 15px; border-radius: 12px; margin-top: 15px; text-align: center;">
            <h4 style="color: #4ade80; font-size: 16px;">تم التسليم والتصحيح بنجاح! 🎉</h4>
            <p style="margin-top: 6px; font-weight: bold; color: white; font-size: 15px;">درجة الطالب: ${score} من ${totalQ} (${percentage}%)</p>
        </div>
    `;

    try {
        await setDoc(doc(db, "submissions", `${student}_${title}`), {
            student: student,
            examTitle: title,
            score: score,
            total: totalQ,
            percentage: percentage,
            answers: studentAnswers,
            submittedAt: new Date().toLocaleString('ar-EG')
        });
    } catch (e) {
        console.error(e);
    }
};

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    if (tabName === 'videos') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('tab-videos').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('tab-homework').classList.add('active');
    }
};

window.backToCourses = function() {
    document.getElementById('video-player-section').style.display = 'none';
    document.getElementById('platform-section').style.display = 'block';
    document.getElementById('main-video-frame').src = '';
    currentActiveCourse = null;
};