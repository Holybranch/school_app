import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  writeBatch,
  Timestamp
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

// --- 인터페이스 정의 (타입 에러 방지) ---
interface Student {
  id: string;
  name: string;
  studentId: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  name: string;
  entryTime: Timestamp;
  exitTime: Timestamp | null;
  date: string;
}

// --- Firebase 설정 적용 ---
const firebaseConfig = {
  apiKey: "AIzaSyDtmPjuSordXKqrLLZLXkrHwJQbiAdIsUk",
  authDomain: "miracle-d9219.firebaseapp.com",
  projectId: "miracle-d9219",
  storageBucket: "miracle-d9219.firebasestorage.app",
  messagingSenderId: "790806998992",
  appId: "1:790806998992:web:966f51d3bdfff5fce013d5",
  measurementId: "G-LG710J1VV0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'daily-miracle-juseong';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) { console.error("Auth error:", err); }
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
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
      setLoading(false);
    });

    const unsubAttendance = onSnapshot(attendanceRef, (snapshot) => {
      setAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    });

    return () => { unsubStudents(); unsubAttendance(); };
  }, [user]);

  const activeRecords = useMemo(() => attendance.filter(r => !r.exitTime), [attendance]);
  const activeStudents = useMemo(() => {
    const activeIds = activeRecords.map(r => r.studentId);
    return students.filter(s => activeIds.includes(s.studentId));
  }, [students, activeRecords]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const s = students.find(x => x.studentId === searchQuery);
    setFoundStudent(s || 'not_found');
  };

  const handleCheckIn = async () => {
    if (!user || !foundStudent || foundStudent === 'not_found') return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), {
      studentId: foundStudent.studentId,
      name: foundStudent.name,
      entryTime: serverTimestamp(),
      exitTime: null,
      date: new Date().toISOString().split('T')[0]
    });
    setSearchQuery('');
    setFoundStudent(null);
  };

  const handleCheckOut = async (sid: string) => {
    const record = activeRecords.find(x => x.studentId === sid);
    if (!record) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', record.id), {
      exitTime: serverTimestamp()
    });
    setFoundStudent(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-indigo-700 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-20">
      <header className="bg-white p-8 rounded-b-[3.5rem] shadow-sm border-b">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-black text-indigo-700">Daily Miracle</h1>
          <button onClick={() => setShowAdminMenu(!showAdminMenu)} className="p-4 bg-indigo-50 rounded-2xl"><LayoutDashboard /></button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-10 space-y-8">
        <section className="bg-white p-8 rounded-[3rem] shadow-xl">
          <form onSubmit={handleSearch} className="space-y-4">
            <input 
              className="w-full p-6 bg-slate-50 rounded-3xl text-2xl font-black outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="학번 입력"
            />
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">확인</button>
          </form>

          {foundStudent && (
            <div className="mt-6 p-6 bg-indigo-600 rounded-3xl text-white">
              {foundStudent === 'not_found' ? "학번을 찾을 수 없습니다." : (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-bold">{foundStudent.name}</div>
                    <div>{foundStudent.studentId}</div>
                  </div>
                  {activeStudents.some(s => s.studentId === foundStudent.studentId) ? (
                    <button onClick={() => handleCheckOut(foundStudent.studentId)} className="bg-white text-indigo-700 px-6 py-2 rounded-xl font-bold">퇴실</button>
                  ) : (
                    <button onClick={handleCheckIn} className="bg-emerald-400 text-white px-6 py-2 rounded-xl font-bold">입실</button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xl font-bold mb-4">현재 학습 중 ({activeStudents.length}명)</h3>
          <div className="grid grid-cols-2 gap-4">
            {activeStudents.map(s => (
              <div key={s.studentId} className="bg-white p-6 rounded-[2rem] shadow-sm border">
                <div className="font-bold text-lg">{s.name}</div>
                <div className="text-sm text-slate-400">{s.studentId}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
