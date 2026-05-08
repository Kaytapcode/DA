import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@components/ui/Card'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { UserShell, useUserLanguage } from './UserShell'

const useLang = useUserLanguage

export const UserHomePagePage: React.FC = () => {
	const isVi = useLang()

	const quickActions = [
		{
			title: isVi ? 'The ghi nho' : 'Flashcards',
			description: isVi ? 'On tap 42 the cho Quantum Mechanics I.' : 'Review 42 due cards in Quantum Mechanics I.',
			cta: isVi ? 'XEM NGAY' : 'REVIEW NOW',
			icon: 'auto_stories',
			accent: '#4f6cf7',
			bg: '#f6f8ff',
			path: '/user/flashcards',
		},
		{
			title: isVi ? 'Bai Kiem Tra' : 'Quizzes',
			description: isVi ? 'Tiep theo: Probabilistic Systems. 15 cau hoi.' : 'Next up: Probabilistic Systems. 15 questions.',
			cta: isVi ? 'BAT DAU' : 'START TEST',
			icon: 'quiz',
			accent: '#c15a27',
			bg: '#fff7f2',
			path: '/user/quiz',
		},
		{
			title: isVi ? 'Tai Lieu Khoa Hoc' : 'Course Docs',
			description: isVi ? "Tiep tuc doc: Bell's Theorem Overview." : "Continue reading: Bell's Theorem Overview.",
			cta: isVi ? 'DOC TIEP' : 'RESUME READING',
			icon: 'description',
			accent: '#5b6982',
			bg: '#f7f9fc',
			path: '/user/documents',
		},
	]

	const recommendedCourses = [
		{
			title: isVi ? 'Ma Hoa Lien Tu' : 'Quantum Cryptography',
			subtitle: isVi ? 'Bao mat giao tiep nang cao.' : 'Master secure communication protocol.',
			rating: '4.9',
			duration: '12 hrs',
			badge: isVi ? 'NANG CAO' : 'ADVANCED',
			badgeColor: '#4f6cf7',
			gradient: 'radial-gradient(circle at 35% 35%, #6a8bff 2%, #153463 22%, #0f233f 60%, #091427 100%)',
			cover: 'Q',
		},
		{
			title: isVi ? 'Giai Tich Tensor' : 'Tensor Calculus',
			subtitle: isVi ? 'Nen tang cho thuyet tuong doi.' : 'The language of general relativity.',
			rating: '4.7',
			duration: '24 hrs',
			badge: 'CORE',
			badgeColor: '#d26a2e',
			gradient: 'radial-gradient(circle at 30% 40%, #6fa6d8 1%, #294b70 25%, #1a314b 60%, #0f1f31 100%)',
			cover: '∑',
		},
		{
			title: isVi ? 'Dong Luc Than Kinh' : 'Neural Dynamics',
			subtitle: isVi ? 'Mo phong tri tue sinh hoc.' : 'Simulating biological intelligence.',
			rating: '5.0',
			duration: '18 hrs',
			badge: isVi ? 'XU HUONG' : 'TRENDING',
			badgeColor: '#3044bb',
			gradient: 'radial-gradient(circle at 65% 35%, #5a9ccd 1%, #163a5a 22%, #102b45 55%, #0b1d30 100%)',
			cover: 'N',
		},
		{
			title: isVi ? 'Entropy Thong Tin' : 'Information Entropy',
			subtitle: isVi ? 'Co so cua tinh toan hien dai.' : 'Foundations of modern computing.',
			rating: '4.8',
			duration: '8 hrs',
			badge: isVi ? 'LY THUYET' : 'THEORY',
			badgeColor: '#4f6cf7',
			gradient: 'linear-gradient(140deg, #f0f3f8 0%, #e7edf6 45%, #d9e6f5 100%)',
			cover: 'E',
		},
	]

	return (
		<UserShell
			titleEn="Home"
			titleVi="Trang Chu"
			subtitleEn="Your personalized learning entry point"
			subtitleVi="Diem vao hoc tap ca nhan hoa"
		>
			<div className="space-y-8">
				<section className="relative overflow-hidden rounded-[34px] border border-[#e6ebf4] bg-gradient-to-br from-[#f8fbff] via-white to-[#edf3ff] p-8 shadow-[0_24px_60px_rgba(66,80,145,0.08)]">
					<div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#dfe8ff]/70 blur-3xl" />
					<div className="absolute -bottom-10 left-1/2 h-36 w-36 rounded-full bg-[#eef4ff]/80 blur-3xl" />

					<div className="relative grid gap-8 lg:grid-cols-[1.55fr_0.75fr] lg:items-center">
						<div className="space-y-6">
							<div className="inline-flex items-center gap-2 rounded-full border border-[#dfe6f4] bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#7c88a4] shadow-sm">
								<span className="h-2 w-2 rounded-full bg-[#4f6cf7]" />
								{isVi ? 'Chao mung tro lai' : 'Welcome back'}
							</div>

							<div className="space-y-4">
								<h2 className="max-w-3xl text-5xl font-black leading-[1.02] text-on-surface font-headline xl:text-[58px]">
									{isVi ? 'Chao mung, Alex.' : 'Welcome back, Alex.'}
								</h2>
								<p className="max-w-2xl text-lg leading-8 text-on-surface-variant">
									{isVi
										? 'Cac mach than kinh cua ban da san sang. Tiep tuc lo trinh hoc tap ve Quantum Computing va Linear Algebra ngay hom nay.'
										: 'Your neural pathways are primed. Ready to continue your journey into Quantum Computing and Linear Algebra?'}
								</p>
							</div>

							<div className="flex flex-wrap gap-3">
								<Link
									to="/user/course/advanced-quantum-mechanics"
									className="inline-flex items-center justify-center rounded-full bg-[#4f6cf7] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(79,108,247,0.28)] transition hover:bg-[#395de8]"
								>
									{isVi ? 'Tiep tuc hoc' : 'Continue Learning'}
								</Link>
								<Link
									to="/user/courses"
									className="inline-flex items-center justify-center rounded-full border border-[#d8e0f0] bg-white px-6 py-3 text-sm font-semibold text-on-surface transition hover:bg-[#f7f9ff]"
								>
									{isVi ? 'Xem khoa hoc' : 'View Courses'}
								</Link>
							</div>

							<div className="flex flex-wrap gap-3 pt-2">
								{[
									{ label: isVi ? 'Dang hoc' : 'In Progress', value: '6 courses' },
									{ label: isVi ? 'Tuan nay' : 'This week', value: '14h 20m' },
									{ label: isVi ? 'Nhip hoc' : 'Streak', value: '12 days' },
								].map((metric) => (
									<div key={metric.label} className="rounded-2xl border border-[#e6ebf4] bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
										<div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#95a0b5]">{metric.label}</div>
										<div className="mt-1 text-sm font-semibold text-on-surface">{metric.value}</div>
									</div>
								))}
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
							<Card className="rounded-[30px] border border-[#eef1f8] bg-white/90 p-6 shadow-[0_16px_36px_rgba(63,77,143,0.08)]">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#92a0b8]">{isVi ? 'Chuoi hoc' : 'Streak'}</p>
										<p className="mt-2 text-4xl font-black text-on-surface">12</p>
									</div>
									<div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fff4ee] text-[#d05d29]">
										<MaterialIcon icon="local_fire_department" size="lg" fill />
									</div>
								</div>
								<div className="mt-5 h-2 rounded-full bg-[#eef2f7]"><div className="h-2 w-[72%] rounded-full bg-[#d05d29]" /></div>
							</Card>

							<Card className="rounded-[30px] border border-[#eef1f8] bg-white/90 p-6 shadow-[0_16px_36px_rgba(63,77,143,0.08)]">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#92a0b8]">{isVi ? 'Mastery' : 'Mastery'}</p>
										<p className="mt-2 text-4xl font-black text-on-surface">84%</p>
									</div>
									<div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eef2ff] text-[#4f6cf7]">
										<MaterialIcon icon="verified" size="lg" fill />
									</div>
								</div>
								<div className="mt-5 h-2 rounded-full bg-[#eef2f7]"><div className="h-2 w-[84%] rounded-full bg-[#4f6cf7]" /></div>
							</Card>
						</div>
					</div>
				</section>

				<section className="grid gap-6 md:grid-cols-3">
					{quickActions.map((item) => (
						<Card key={item.title} className="group overflow-hidden border border-[#e8edf5] p-6 shadow-[0_14px_34px_rgba(63,77,143,0.08)] transition-transform duration-200 hover:-translate-y-1">
							<div className="mb-5 flex items-start justify-between">
								<div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: item.bg, color: item.accent }}>
									<MaterialIcon icon={item.icon} size="md" fill />
								</div>
								<div className="rounded-full bg-[#f5f7fb] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa4b7]">
									{item.cta}
								</div>
							</div>
							<h3 className="text-2xl font-bold text-on-surface">{item.title}</h3>
							<p className="mt-3 min-h-[56px] text-sm leading-6 text-on-surface-variant">{item.description}</p>
							<Link
								to={item.path}
								className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] transition hover:opacity-80"
								style={{ color: item.accent }}
							>
								{item.cta}
								<MaterialIcon icon="arrow_forward" size="sm" />
							</Link>
						</Card>
					))}
				</section>

				<section className="space-y-4">
					<div className="flex items-end justify-between gap-4">
						<div>
							<h3 className="text-2xl font-bold text-on-surface font-headline">{isVi ? 'De xuat cho lo trinh cua ban' : 'Recommended for your path'}</h3>
							<p className="mt-1 text-sm text-on-surface-variant">{isVi ? 'Lua chon khoa hoc phu hop voi nhip hoc cua ban.' : 'Curated courses aligned with your current pace.'}</p>
						</div>
						<Link to="/user/courses" className="text-sm font-semibold text-[#4f6cf7]">{isVi ? 'Xem tat ca khoa hoc' : 'View All Courses'}</Link>
					</div>

					<div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
						{recommendedCourses.map((course) => (
							<Card key={course.title} className="overflow-hidden border border-[#e8edf5] p-0 shadow-[0_16px_34px_rgba(63,77,143,0.08)] transition-transform duration-200 hover:-translate-y-1">
								<div className="relative h-44 overflow-hidden" style={{ background: course.gradient }}>
									<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_30%)]" />
									<div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-black text-white backdrop-blur-sm">
										{course.cover}
									</div>
									<span className="absolute left-3 bottom-3 rounded-full px-3 py-1 text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: course.badgeColor }}>
										{course.badge}
									</span>
								</div>
								<div className="p-5">
									<h4 className="min-h-[62px] text-2xl font-bold leading-tight text-on-surface">{course.title}</h4>
									<p className="mt-2 min-h-[42px] text-sm leading-6 text-on-surface-variant">{course.subtitle}</p>
									<div className="mt-4 flex items-center justify-between text-sm text-[#7b879b]">
										<span className="flex items-center gap-1.5">
											<MaterialIcon icon="star" size="sm" className="text-[#f2b53f]" />
											{course.rating}
										</span>
										<span>{course.duration}</span>
									</div>
								</div>
							</Card>
						))}
					</div>
				</section>

				<p className="text-center text-xs text-[#9aa4b7]">
					{isVi ? '© 2026 Lumina Quantum Systems. Moi du lieu duoc ma hoa.' : '© 2026 Lumina Quantum Systems. All neural data encrypted.'}
				</p>
			</div>
		</UserShell>
	)
}

