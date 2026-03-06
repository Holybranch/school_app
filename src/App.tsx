import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import {
  Search,
  UserCheck,
  Sparkles,
  ChevronRight,
  LogOut,
  Clock,
  LayoutDashboard,
  Trash2,
  AlertCircle
} from 'lucide-react';

// Firebase 설정
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'daily-miracle-juseong';

const App = () => {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [foundStudent, setFoundStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth initialization failed:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
   
    const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
    const attendanceRef = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');

    const unsubStudents = onSnapshot(studentsRef, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubAttendance = onSnapshot(attendanceRef, (snapshot) => {
      setAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubStudents(); unsubAttendance(); };
  }, [user]);

  const activeRecords = useMemo(() => {
    return attendance.filter(r => !r.exitTime);
  }, [attendance]);

  const activeStudents = useMemo(() => {
    const activeIds = activeRecords.map(r => r.studentId);
    return students.filter(s => activeIds.includes(s.studentId));
  }, [students, activeRecords]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const s = students.find(x => x.studentId === searchQuery);
    setFoundStudent(s || 'not_found');
  };

  const handleCheckIn = async () => {
    if (!user || !foundStudent || foundStudent === 'not_found') return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), {
        studentId: foundStudent.studentId,
        name: foundStudent.name,
        entryTime: serverTimestamp(),
        exitTime: null,
        date: new Date().toISOString().split('T')[0]
      });
      setSearchQuery('');
      setFoundStudent(null);
    } catch (err) { console.error("Check-in error:", err); }
  };

  const handleCheckOut = async (sid) => {
    if (!user) return;
    const record = activeRecords.find(x => x.studentId === sid);
    if (!record) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', record.id), {
        exitTime: serverTimestamp(),
        duration: Math.floor((new Date() - record.entryTime.toDate()) / 60000)
      });
      setFoundStudent(null);
    } catch (err) { console.error("Check-out error:", err); }
  };

  // 일괄 퇴실 처리
  const handleBulkCheckOut = async () => {
    if (!user || activeRecords.length === 0) return;
    if (!window.confirm(`현재 입실 중인 ${activeRecords.length}명을 모두 퇴실 처리하시겠습니까?`)) return;

    try {
      const batch = writeBatch(db);
      activeRecords.forEach(record => {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'attendance', record.id);
        batch.update(docRef, {
          exitTime: serverTimestamp(),
          duration: Math.floor((new Date() - record.entryTime.toDate()) / 60000)
        });
      });
      await batch.commit();
      setShowAdminMenu(false);
    } catch (err) { console.error("Bulk check-out error:", err); }
  };

  if (loading && !user) return (
    <div className="h-screen flex flex-col items-center justify-center bg-indigo-700 text-white font-sans">
      <div className="animate-pulse mb-4 text-4xl">● ● ●</div>
      <div className="text-xl font-bold tracking-[0.3em]">DAILY MIRACLE</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFF] font-sans text-slate-900 pb-20">
      {/* 헤더 섹션 */}
      <header className="bg-white px-8 pt-12 pb-8 rounded-b-[3.5rem] shadow-sm border-b border-indigo-50">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-indigo-700 tracking-tight leading-none">Daily Miracle</h1>
            <p className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase mt-2">Study Management System</p>
          </div>
          <button
            onClick={() => setShowAdminMenu(!showAdminMenu)}
            className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all shadow-inner ${showAdminMenu ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-indigo-50 text-indigo-600'}`}
          >
            <LayoutDashboard size={28} />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-10 space-y-10">
        {/* 관리자 메뉴 (일괄 퇴실) */}
        {showAdminMenu && (
          <section className="bg-indigo-50 p-6 rounded-[2.5rem] border-2 border-indigo-100 animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-indigo-600" />
                <span className="font-bold text-indigo-900">관리자 도구</span>
              </div>
              <button
                onClick={handleBulkCheckOut}
                disabled={activeRecords.length === 0}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg flex items-center gap-2 active:scale-95 transition-all disabled:opacity-30"
              >
                <Trash2 size={16} /> 일괄 퇴실 처리
              </button>
            </div>
          </section>
        )}

        {/* 학생 검색 및 액션 카드 */}
        <section className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-indigo-100/50 border border-white relative overflow-hidden">
          <form onSubmit={handleSearch} className="relative z-10">
            <div className="flex items-center gap-3 mb-2 ml-2">
              <Search size={16} className="text-indigo-400" />
              <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Enter Student ID</span>
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="학번 4자리 입력"
                className="w-full bg-slate-50 py-6 px-8 rounded-3xl text-2xl font-black outline-none focus:ring-4 ring-indigo-50 transition-all border-none shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="absolute right-2 top-2 bottom-2 px-8 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">확인</button>
            </div>
          </form>

          {foundStudent && (
            <div className="mt-8 p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl animate-in zoom-in-95 duration-300">
              {foundStudent === 'not_found' ? (
                <div className="text-center py-4">
                  <p className="text-xl font-black">등록되지 않은 학번입니다.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-black text-indigo-200 mb-1 opacity-70 uppercase tracking-widest">Verified Profile</p>
                      <div className="text-4xl font-black tracking-tight">{foundStudent.name}</div>
                      <div className="text-indigo-300 font-bold mt-1 text-lg">{foundStudent.studentId}</div>
                    </div>
                    <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-sm">
                       <UserCheck size={36} className="text-white" />
                    </div>
                  </div>
                 
                  <div className="pt-6 border-t border-indigo-500/50">
                    {activeStudents.some(s => s.studentId === foundStudent.studentId) ? (
                      <button
                        onClick={() => handleCheckOut(foundStudent.studentId)}
                        className="w-full bg-white text-indigo-700 py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                      >
                        <LogOut size={22}/> 퇴실 처리
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckIn}
                        className="w-full bg-emerald-400 text-white py-6 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-3 hover:bg-emerald-500 active:scale-95 transition-all"
                      >
                        <Sparkles size={22}/> 입실 기록
                      </button>
                    )}
                  </div>
                  <button onClick={() => setFoundStudent(null)} className="text-center text-indigo-300 text-xs font-bold hover:text-white transition-colors">닫기</button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 입실 현황 리스트 */}
        <section className="px-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              현재 학습 현황
            </h3>
            <div className="text-[11px] font-black text-indigo-600 bg-white px-4 py-2 rounded-2xl shadow-sm border border-indigo-50">
              총 <span className="text-lg mx-0.5">{activeStudents.length}</span>명
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {activeStudents.length === 0 ? (
              <div className="col-span-2 py-16 bg-white/40 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-400">
                <Clock size={40} className="mb-3 opacity-10" />
                <p className="text-sm font-black opacity-40 uppercase tracking-widest">No active students</p>
              </div>
            ) : (
              activeStudents.map(s => (
                <div key={s.studentId} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 flex items-center justify-between group hover:shadow-md hover:border-indigo-100 transition-all">
                  <div>
                    <div className="font-black text-xl text-slate-800 group-hover:text-indigo-700 transition-colors">{s.name}</div>
                    <div className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-0.5">{s.studentId}</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl text-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-300 transition-all">
                    <ChevronRight size={18} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="max-w-xl mx-auto mt-20 px-8 text-center">
        <div className="h-[1px] w-12 bg-slate-200 mx-auto mb-4"></div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Official Management Suite</p>
      </footer>
    </div>
  );
};

export default App;
