type TranslationKey =
  | 'settings.title'
  | 'settings.profile'
  | 'settings.language'
  | 'settings.statistics'
  | 'settings.dangerZone'
  | 'settings.deleteAccount'
  | 'settings.signOut'
  | 'settings.save'
  | 'settings.email'
  | 'settings.username'
  | 'settings.description'
  | 'settings.accountCreated'
  | 'settings.lastActive'
  | 'settings.totalReactionsReceived'
  | 'settings.totalReactionsSent'
  | 'settings.totalComments'
  | 'settings.creditsAvailable'
  | 'settings.dangerZoneWarning'
  | 'settings.deleteConfirmTitle'
  | 'settings.deleteConfirmMessage'
  | 'settings.cancel'
  | 'settings.delete'
  | 'settings.success'
  | 'settings.successMessage'
  | 'settings.error'
  | 'settings.errorProfile'
  | 'settings.errorSignOut'
  | 'settings.errorDelete'
  | 'profile.loading'
  | 'profile.welcomeBack'
  | 'profile.createAccount'
  | 'profile.email'
  | 'profile.password'
  | 'profile.signIn'
  | 'profile.signUp'
  | 'profile.switchToSignUp'
  | 'profile.switchToSignIn'
  | 'profile.noDescription'
  | 'profile.addDescription'
  | 'profile.comments'
  | 'profile.addComment'
  | 'profile.noComments'
  | 'profile.error.session'
  | 'profile.error.profile'
  | 'profile.error.signOut'
  | 'profile.error.image'
  | 'profile.error.fields'
  | 'profile.emailPlaceholder'
  | 'profile.passwordPlaceholder'
  | 'profile.error.invalidEmail'
  |  'profile.error.passwordTooShort'
  | 'feed.loading'
  | 'userList.loading'
  | 'userList.noUsers'
  | 'userProfile.loading'
  | 'userProfile.notFound'
  | 'userProfile.noDescription'
  | 'userProfile.comments'
  | 'userProfile.addComment'
  | 'userProfile.noComments'
  | 'userProfile.leaveAgenda'
  | 'userProfile.leaveConfirm'
  | 'userProfile.error.reaction'
  | 'userProfile.error.comment'
  | 'userProfile.error.insufficientVibes'
  | 'userProfile.error.insufficientVibesDesc'
  | 'userProfile.action.getVibes'
  | 'userProfile.action.viewAgenda'
  | 'store.comingSoon'
  | 'store.comingSoonDesc'
  | 'store.error'
  | 'store.errorPurchase'
  | 'store.bestValue'
  | 'store.bundle.starter'
  | 'store.bundle.popular'
  | 'store.bundle.super'
  | 'store.bundle.mega'
  | 'modal.settings'
  | 'modal.urgent'
  | 'modal.profile'
  | 'modal.completed'
  | 'modal.members'
  | 'modal.store'
  | 'modal.calendar'
  | 'tabs.home'
  | 'tabs.feed'
  | 'tabs.profile'
  | 'agenda.loading'
  | 'agenda.notFound'
  | 'agenda.addSection'
  | 'agenda.newSection'
  | 'agenda.cancel'
  | 'agenda.add'
  | 'agenda.addElement'
  | 'agenda.elementSubject'
  | 'agenda.elementDetails'
  | 'agenda.elementDeadline'
  | 'agenda.deleteSection'
  | 'agenda.deleteSectionConfirm'
  | 'agenda.deleteElement'
  | 'agenda.deleteElementConfirm'
  | 'agenda.deleteAgenda'
  | 'agenda.deleteAgendaConfirm'
  | 'agenda.leaveAgenda'
  | 'agenda.leaveAgendaConfirm'
  | 'agenda.members'
  | 'agenda.comments'
  | 'agenda.addComment'
  | 'agenda.noComments'
  | 'agenda.error'
  | 'agenda.noElements'
  | 'agenda.viewCompleted'
  | 'agenda.noSections'
  | 'agenda.due'
  | 'agenda.header'
  | 'agenda.errorLeave'
  | 'agenda.editElement'
  | 'agenda.save'
  | 'agenda.errorEditElement'
  | 'time.now'
  | 'time.seconds'
  | 'time.minutes'
  | 'time.hours'
  | 'time.days'
  | 'time.months'
  | 'time.years'
  | 'members.creator'
  | 'members.editor'
  | 'members.member'
  | 'members.promote'
  | 'members.demote'
  | 'members.loading'
  | 'home.viewAgenda'
  | 'home.welcome'
  | 'home.create'
  | 'home.join'
  | 'home.agendas'
  | 'home.noAgendas'
  | 'home.createAgenda'
  | 'home.joinAgenda'
  | 'home.createAgendaTitle'
  | 'home.agendaName'
  | 'home.joinAgendaTitle'
  | 'home.agendaCode'
  | 'home.validCode'
  | 'home.invalidCode'
  | 'home.error.create'
  | 'home.error.join'
  | 'home.error.fetch'
  | 'home.loading'
  | 'home.atype'
  | 'home.error.nameTooLong'
  | 'home.error.invalidChars'
  | 'home.error.alreadyOwner'
  | 'home.error.privateKey'
  | 'home.error.alreadyMember'
  | 'home.success.joined'
  | 'home.success.created'
  | 'agenda.error.sectionNameTooLong'
  | 'agenda.error.sectionNameInvalid'
  | 'agenda.error.elementSubjectTooLong'
  | 'agenda.error.elementSubjectInvalid'
  | 'completed.tapToUncomplete'
  | 'settings.theme'
  | 'settings.theme.light'
  | 'settings.theme.dark'
  | 'settings.theme.system'
  | 'common.offline'
  | 'calendar.header'
  | 'calendar.noEvents'
  | 'calendar.days.sun'
  | 'calendar.days.mon'
  | 'calendar.days.tue'
  | 'calendar.days.wed'
  | 'calendar.days.thu'
  | 'calendar.days.fri'
  | 'calendar.days.sat'
  | 'calendar.allSections'
  | 'calendar.weekView'
  | 'calendar.monthView'
  | 'calendar.months.jan'
  | 'calendar.months.feb'
  | 'calendar.months.mar'
  | 'calendar.months.apr'
  | 'calendar.months.may'
  | 'calendar.months.jun'
  | 'calendar.months.jul'
  | 'calendar.months.aug'
  | 'calendar.months.sep'
  | 'calendar.months.oct'
  | 'calendar.months.nov'
  | 'calendar.months.dec'
  | 'home.notLoggedIn'
  | 'home.loginRequired'
  | 'home.goToLogin'
  | 'profile.commentsDisabled'
  | 'agenda.commentsDisabled'
  | 'home.keyCopied'
  | 'agenda.deleteMemberConfirm'
  | 'comments.readMore'
  | 'comments.showLess'
  | 'notifications.newReaction'
  | 'notifications.reactionReceived'
  | 'reactions.hug'
  | 'reactions.heart'
  | 'reactions.kiss'
  | 'agenda.you'
  | 'auth.error.invalidLogin'
  | 'auth.error.emailInUse'
  | 'auth.error.weakPassword'
  | 'auth.error.invalidEmail'
  | 'auth.error.missingFields'
  | 'auth.error.generic';

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Español',
  fr: 'Français'
} as const;

export type Language = keyof typeof SUPPORTED_LANGUAGES;

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    'settings.title': 'Account Settings',
    'settings.profile': 'Profile Information',
    'settings.language': 'Language',
    'settings.statistics': 'Statistics',
    'settings.dangerZone': 'Danger Zone',
    'settings.deleteAccount': 'Delete Account',
    'settings.signOut': 'Sign Out',
    'settings.save': 'Save Changes',
    'settings.email': 'Email',
    'settings.username': 'Username',
    'settings.description': 'Description',
    'settings.accountCreated': 'Account Created',
    'settings.lastActive': 'Last Active',
    'settings.totalReactionsReceived': 'Total Reactions Received',
    'settings.totalReactionsSent': 'Total Reactions Sent',
    'settings.totalComments': 'Total Comments',
    'settings.creditsAvailable': 'Credits Available',
    'settings.dangerZoneWarning': 'This action cannot be undone. All your data will be permanently deleted.',
    'settings.deleteConfirmTitle': 'Delete Account',
    'settings.deleteConfirmMessage': 'This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?',
    'settings.cancel': 'Cancel',
    'settings.delete': 'Delete',
    'settings.success': 'Success',
    'settings.successMessage': 'Profile updated successfully!',
    'settings.error': 'Error',
    'settings.errorProfile': 'Failed to update profile',
    'settings.errorSignOut': 'Failed to sign out',
    'settings.errorDelete': 'Failed to delete account',
    'profile.loading': 'Loading profile...',
    'profile.welcomeBack': 'Welcome Back',
    'profile.createAccount': 'Create Account',
    'profile.email': 'Email',
    'profile.password': 'Password',
    'profile.signIn': 'Sign in',
    'profile.signUp': 'Sign up',
    'profile.switchToSignUp': 'Need an account? Sign up',
    'profile.switchToSignIn': 'Already have an account? Sign in',
    'profile.noDescription': 'No description',
    'profile.addDescription': 'Add a description...',
    'profile.comments': 'Comments',
    'profile.addComment': 'Add a comment...',
    'profile.noComments': 'No comments yet. Be the first to comment!',
    'profile.error.session': 'Failed to initialize session',
    'profile.error.profile': 'Failed to load profile',
    'profile.error.signOut': 'Failed to sign out. Please try again.',
    'profile.error.image': 'Failed to pick image',
    'profile.error.fields': 'Please fill in all fields',
    'profile.commentsDisabled': 'Comments are disabled for this profile',
    'profile.emailPlaceholder': 'email@address.com',
    'profile.passwordPlaceholder': 'Password',
    'profile.error.invalidEmail': 'Please enter a valid email address',
    'profile.error.passwordTooShort': 'Password must be at least 6 characters',
    'feed.loading': 'Loading feed...',
    'userList.loading': 'Loading users...',
    'userList.noUsers': 'No users found',
    'userProfile.loading': 'Loading profile...',
    'userProfile.notFound': 'Profile not found',
    'userProfile.noDescription': 'No description',
    'userProfile.comments': 'Comments',
    'userProfile.addComment': 'Add a comment...',
    'userProfile.noComments': 'No comments yet. Be the first to comment!',
    'userProfile.leaveAgenda': 'Leave Agenda',
    'userProfile.leaveConfirm': 'Are you sure you want to leave this agenda? This will remove all your data from this agenda.',
    'userProfile.error.reaction': 'Failed to process reaction',
    'userProfile.error.comment': 'Failed to post comment',
    'userProfile.error.insufficientVibes': 'Insufficient Vibes',
    'userProfile.error.insufficientVibesDesc': 'You need {amount} Vibes to send this reaction. Would you like to get more?',
    'userProfile.action.getVibes': 'Get Vibes',
    'userProfile.action.viewAgenda': 'View',
    'store.comingSoon': 'Coming Soon',
    'store.comingSoonDesc': 'Payments will be available in a future update!',
    'store.error': 'Error',
    'store.errorPurchase': 'Failed to process purchase',
    'store.bestValue': 'BEST VALUE',
    'store.bundle.starter': 'Starter Pack',
    'store.bundle.popular': 'Popular Pack',
    'store.bundle.super': 'Super Pack',
    'store.bundle.mega': 'Mega Pack',
    'modal.settings': 'Settings',
    'modal.urgent': 'Urgent Items',
    'modal.profile': 'Profile',
    'modal.completed': 'Completed Items',
    'modal.members': 'Manage Members',
    'modal.store': 'Store',
    'modal.calendar': 'Calendar',
    'tabs.home': 'Home',
    'tabs.feed': 'Feed',
    'tabs.profile': 'Profile',
    'agenda.loading': 'Loading agenda...',
    'agenda.notFound': 'Agenda not found',
    'agenda.addSection': 'Add Section',
    'agenda.newSection': 'New Section',
    'agenda.cancel': 'Cancel',
    'agenda.add': 'Add',
    'agenda.addElement': 'Add Element',
    'agenda.elementSubject': 'Subject',
    'agenda.elementDetails': 'Details (optional)',
    'agenda.elementDeadline': 'Deadline (YYYY-MM-DD)',
    'agenda.deleteSection': 'Delete Section',
    'agenda.deleteSectionConfirm': 'Are you sure you want to delete "{name}"? This will also delete all elements in this section.',
    'agenda.deleteElement': 'Delete Element',
    'agenda.deleteElementConfirm': 'Are you sure you want to delete "{name}"?',
    'agenda.deleteAgenda': 'Delete Agenda',
    'agenda.deleteAgendaConfirm': 'This will permanently delete this agenda and all its contents. This action cannot be undone.',
    'agenda.leaveAgenda': 'Leave',
    'agenda.leaveAgendaConfirm': 'Are you sure you want to leave this agenda? This will remove all your data from this agenda.',
    'agenda.members': 'Members ({count})',
    'agenda.comments': 'Comments',
    'agenda.addComment': 'Add a comment...',
    'agenda.noComments': 'No comments yet. Be the first to comment!',
    'agenda.commentsDisabled': 'Comments are disabled for this agenda',
    'agenda.error': 'Error',
    'agenda.noElements': 'No elements in this section',
    'agenda.viewCompleted': 'View Completed ({count})',
    'agenda.noSections': 'No sections yet',
    'agenda.due': 'Due',
    'agenda.header': 'Agenda',
    'agenda.errorLeave': 'Failed to leave agenda',
    'agenda.error.sectionNameTooLong': 'Section name cannot exceed 15 characters',
    'agenda.error.sectionNameInvalid': 'Section name can only contain letters, numbers, and spaces',
    'agenda.error.elementSubjectTooLong': 'Element subject cannot exceed 15 characters',
    'agenda.error.elementSubjectInvalid': 'Element subject can only contain letters, numbers, and spaces',
    'agenda.editElement': 'Edit Element',
    'agenda.save': 'Save',
    'agenda.errorEditElement': 'Failed to edit element',
    'agenda.deleteMemberConfirm': 'Are you sure you want to remove this member? This will delete all their data from this agenda.',
    'time.now': 'Just now',
    'time.seconds': '{n}s ago',
    'time.minutes': '{n}m ago',
    'time.hours': '{n}h ago',
    'time.days': '{n}d ago',
    'time.months': '{n}mo ago',
    'time.years': '{n}y ago',
    'members.creator': 'Creator',
    'members.editor': 'Editor',
    'members.member': 'Member',
    'members.promote': 'Make Editor',
    'members.demote': 'Demote',
    'members.loading': 'Loading members...',
    'home.viewAgenda': 'View in Agenda',
    'home.welcome': 'Welcome',
    'home.create': 'Create',
    'home.join': 'Join',
    'home.agendas': 'Your Agendas',
    'home.noAgendas': 'No agendas yet',
    'home.createAgenda': 'Create Agenda',
    'home.joinAgenda': 'Join Agenda',
    'home.createAgendaTitle': 'Create New Agenda',
    'home.agendaName': 'Agenda Name',
    'home.joinAgendaTitle': 'Join an Agenda',
    'home.agendaCode': 'Key',
    'home.validCode': 'Valid code',
    'home.invalidCode': 'Invalid code',
    'home.error.create': 'Failed to create agenda',
    'home.error.join': 'Failed to join agenda',
    'home.error.fetch': 'Failed to load agendas',
    'home.loading': 'Loading...',
    'home.atype': 'Make Public',
    'home.error.nameTooLong': 'Agenda name cannot exceed 15 characters',
    'home.error.invalidChars': 'Agenda name can only contain letters, numbers, and spaces',
    'home.error.alreadyOwner': "You're already the owner of this agenda",
    'home.error.privateKey': "This agenda's key is private",
    'home.error.alreadyMember': "You're already a member of this agenda",
    'home.success.joined': 'Successfully joined agenda "{name}"!',
    'home.success.created': 'Agenda created successfully!',
    'home.keyCopied': 'Agenda key copied to clipboard',
    'completed.tapToUncomplete': 'Tap to uncomplete',
    'settings.theme': 'Theme',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.system': 'System',
    'common.offline': "You're offline",
    'calendar.header': 'Calendar View',
    'calendar.noEvents': 'No events on this day',
    'calendar.days.sun': 'Sun',
    'calendar.days.mon': 'Mon',
    'calendar.days.tue': 'Tue',
    'calendar.days.wed': 'Wed',
    'calendar.days.thu': 'Thu',
    'calendar.days.fri': 'Fri',
    'calendar.days.sat': 'Sat',
    'calendar.allSections': 'All Sections',
    'calendar.weekView': 'Week',
    'calendar.monthView': 'Month',
    'calendar.months.jan': 'January',
    'calendar.months.feb': 'February',
    'calendar.months.mar': 'March',
    'calendar.months.apr': 'April',
    'calendar.months.may': 'May',
    'calendar.months.jun': 'June',
    'calendar.months.jul': 'July',
    'calendar.months.aug': 'August',
    'calendar.months.sep': 'September',
    'calendar.months.oct': 'October',
    'calendar.months.nov': 'November',
    'calendar.months.dec': 'December',
    'home.notLoggedIn': 'Welcome to Aghendi',
    'home.loginRequired': 'Please sign in to view and manage your agendas',
    'home.goToLogin': 'Go to Login',
    'comments.readMore': 'Read more',
    'comments.showLess': 'Show less',
    'notifications.newReaction': 'New Reaction!',
    'notifications.reactionReceived': '{username} reacted with a {reaction} to your profile!',
    'reactions.hug': 'hug',
    'reactions.heart': 'heart',
    'reactions.kiss': 'kiss',
    'agenda.you': 'You',
    'auth.error.invalidLogin': 'Invalid email or password',
    'auth.error.emailInUse': 'Email is already in use',
    'auth.error.weakPassword': 'Password is too weak',
    'auth.error.invalidEmail': 'Invalid email format',
    'auth.error.missingFields': 'Please fill in all fields',
    'auth.error.generic': 'An error occurred. Please try again',
  },
  es: {
    'settings.title': 'Ajustes de Cuenta',
    'settings.profile': 'Información del Perfil',
    'settings.language': 'Idioma',
    'settings.statistics': 'Estadísticas',
    'settings.dangerZone': 'Zona de Peligro',
    'settings.deleteAccount': 'Eliminar Cuenta',
    'settings.signOut': 'Cerrar Sesión',
    'settings.save': 'Guardar Cambios',
    'settings.email': 'Correo',
    'settings.username': 'Nombre de Usuario',
    'settings.description': 'Descripción',
    'settings.accountCreated': 'Cuenta Creada',
    'settings.lastActive': 'Última Actividad',
    'settings.totalReactionsReceived': 'Reacciones Recibidas',
    'settings.totalReactionsSent': 'Reacciones Enviadas',
    'settings.totalComments': 'Comentarios Totales',
    'settings.creditsAvailable': 'Créditos Disponibles',
    'settings.dangerZoneWarning': 'Esta acción no se puede deshacer. Todos tus datos serán eliminados permanentemente.',
    'settings.deleteConfirmTitle': 'Eliminar Cuenta',
    'settings.deleteConfirmMessage': 'Esto eliminará permanentemente tu cuenta y todos los datos asociados. Esta acción no se puede deshacer. ¿Estás seguro?',
    'settings.cancel': 'Cancelar',
    'settings.delete': 'Eliminar',
    'settings.success': 'Éxito',
    'settings.successMessage': '¡Perfil actualizado exitosamente!',
    'settings.error': 'Error',
    'settings.errorProfile': 'Error al actualizar el perfil',
    'settings.errorSignOut': 'Error al cerrar sesión',
    'settings.errorDelete': 'Error al eliminar la cuenta',
    'profile.loading': 'Cargando perfil...',
    'profile.welcomeBack': 'Bienvenido de Nuevo',
    'profile.createAccount': 'Crear Cuenta',
    'profile.email': 'Correo',
    'profile.password': 'Contraseña',
    'profile.signIn': 'Iniciar Sesión',
    'profile.signUp': 'Registrarse',
    'profile.switchToSignUp': '¿Necesitas una cuenta? Regístrate',
    'profile.switchToSignIn': '¿Ya tienes una cuenta? Inicia sesión',
    'profile.noDescription': 'Sin descripción',
    'profile.addDescription': 'Añade una descripción...',
    'profile.comments': 'Comentarios',
    'profile.addComment': 'Añade un comentario...',
    'profile.noComments': '¡Aún no hay comentarios. Sé el primero en comentar!',
    'profile.error.session': 'Error al inicializar la sesión',
    'profile.error.profile': 'Error al cargar el perfil',
    'profile.error.signOut': 'Error al cerrar sesión. Inténtalo de nuevo.',
    'profile.error.image': 'Error al seleccionar imagen',
    'profile.error.fields': 'Por favor completa todos los campos',
    'profile.commentsDisabled': 'Los comentarios están desactivados para este perfil',
    'profile.emailPlaceholder': 'correo@ejemplo.com',
    'profile.passwordPlaceholder': 'Contraseña',
    'profile.error.invalidEmail': 'Por favor ingrese un correo válido',
    'profile.error.passwordTooShort': 'La contraseña debe tener al menos 6 caracteres',
    'feed.loading': 'Cargando feed...',
    'userList.loading': 'Cargando usuarios...',
    'userList.noUsers': 'No se encontraron usuarios',
    'userProfile.loading': 'Cargando perfil...',
    'userProfile.notFound': 'Perfil no encontrado',
    'userProfile.noDescription': 'Sin descripción',
    'userProfile.comments': 'Comentarios',
    'userProfile.addComment': 'Añadir un comentario...',
    'userProfile.noComments': '¡Aún no hay comentarios. Sé el primero en comentar!',
    'userProfile.leaveAgenda': 'Salir de la Agenda',
    'userProfile.leaveConfirm': '¿Estás seguro de que quieres salir de esta agenda? Esto eliminará todos tus datos de esta agenda.',
    'userProfile.error.reaction': 'Error al procesar la reacción',
    'userProfile.error.comment': 'Error al publicar el comentario',
    'userProfile.error.insufficientVibes': 'Vibes Insuficientes',
    'userProfile.error.insufficientVibesDesc': 'Necesitas {amount} Vibes para enviar esta reacción. ¿Quieres conseguir más?',
    'userProfile.action.getVibes': 'Obtener Vibes',
    'userProfile.action.viewAgenda': 'Ver',
    'store.comingSoon': 'Próximamente',
    'store.comingSoonDesc': '¡Los pagos estarán disponibles en una actualización futura!',
    'store.error': 'Error',
    'store.errorPurchase': 'Error al procesar la compra',
    'store.bestValue': 'MEJOR VALOR',
    'store.bundle.starter': 'Paquete Inicial',
    'store.bundle.popular': 'Paquete Popular',
    'store.bundle.super': 'Paquete Super',
    'store.bundle.mega': 'Paquete Mega',
    'modal.settings': 'Ajustes',
    'modal.urgent': 'Elementos Urgentes',
    'modal.profile': 'Perfil',
    'modal.completed': 'Elementos Completados',
    'modal.members': 'Administrar Miembros',
    'modal.store': 'Tienda',
    'modal.calendar': 'Calendario',
    'tabs.home': 'Inicio',
    'tabs.feed': 'Feed',
    'tabs.profile': 'Perfil',
    'agenda.loading': 'Cargando agenda...',
    'agenda.notFound': 'Agenda no encontrada',
    'agenda.addSection': 'Añadir Sección',
    'agenda.newSection': 'Nueva Sección',
    'agenda.cancel': 'Cancelar',
    'agenda.add': 'Añadir',
    'agenda.addElement': 'Añadir Elemento',
    'agenda.elementSubject': 'Asunto',
    'agenda.elementDetails': 'Detalles (opcional)',
    'agenda.elementDeadline': 'Fecha límite (AAAA-MM-DD)',
    'agenda.deleteSection': 'Eliminar Sección',
    'agenda.deleteSectionConfirm': '¿Estás seguro de que quieres eliminar "{name}"? Esto también eliminará todos los elementos en esta sección.',
    'agenda.deleteElement': 'Eliminar Elemento',
    'agenda.deleteElementConfirm': '¿Estás seguro de que quieres eliminar "{name}"?',
    'agenda.deleteAgenda': 'Eliminar Agenda',
    'agenda.deleteAgendaConfirm': 'Esto eliminará permanentemente esta agenda y todo su contenido. Esta acción no se puede deshacer.',
    'agenda.leaveAgenda': 'Salir',
    'agenda.leaveAgendaConfirm': '¿Estás seguro de que quieres salir de esta agenda? Esto eliminará todos tus datos de esta agenda.',
    'agenda.members': 'Miembros ({count})',
    'agenda.comments': 'Comentarios',
    'agenda.addComment': 'Añadir un comentario...',
    'agenda.noComments': '¡Aún no hay comentarios. Sé el primero en comentar!',
    'agenda.commentsDisabled': 'Los comentarios están desactivados para esta agenda',
    'agenda.error': 'Error',
    'agenda.noElements': 'No hay elementos en esta sección',
    'agenda.viewCompleted': 'Ver Completados ({count})',
    'agenda.noSections': 'Sin secciones',
    'agenda.due': 'Fecha',
    'agenda.header': 'Agenda',
    'agenda.errorLeave': 'Error al salir de la agenda',
    'agenda.error.sectionNameTooLong': 'El nombre de la sección no puede exceder 15 caracteres',
    'agenda.error.sectionNameInvalid': 'El nombre solo puede contener letras, números y espacios',
    'agenda.error.elementSubjectTooLong': 'El asunto del elemento no puede exceder 15 caracteres',
    'agenda.error.elementSubjectInvalid': 'El asunto solo puede contener letras, números y espacios',
    'agenda.editElement': 'Editar Elemento',
    'agenda.save': 'Guardar',
    'agenda.errorEditElement': 'Error al editar el elemento',
    'agenda.deleteMemberConfirm': '¿Estás seguro de que quieres eliminar a este miembro? Esto eliminará todos sus datos de esta agenda.',
    'time.now': 'Ahora',
    'time.seconds': 'Hace {n}s',
    'time.minutes': 'Hace {n}m',
    'time.hours': 'Hace {n}h',
    'time.days': 'Hace {n}d',
    'time.months': 'Hace {n}m',
    'time.years': 'Hace {n}a',
    'members.creator': 'Creador',
    'members.editor': 'Editor',
    'members.member': 'Miembro',
    'members.promote': 'Hacer Editor',
    'members.demote': 'Degradar',
    'members.loading': 'Cargando miembros...',
    'home.viewAgenda': 'Ver en Agenda',
    'home.welcome': 'Bienvenido',
    'home.create': 'Crear',
    'home.join': 'Unirse',
    'home.agendas': 'Tus Agendas',
    'home.noAgendas': 'Aún no hay agendas',
    'home.createAgenda': 'Crear Agenda',
    'home.joinAgenda': 'Unirse a Agenda',
    'home.createAgendaTitle': 'Crear Nueva Agenda',
    'home.agendaName': 'Nombre de la Agenda',
    'home.joinAgendaTitle': 'Unirse a una Agenda',
    'home.agendaCode': 'Llave',
    'home.validCode': 'Código válido',
    'home.invalidCode': 'Código inválido',
    'home.error.create': 'Error al crear la agenda',
    'home.error.join': 'Error al unirse a la agenda',
    'home.error.fetch': 'Error al cargar las agendas',
    'home.loading': 'Cargando...',
    'home.atype': 'Hacer Pública',
    'home.error.nameTooLong': 'El nombre de la agenda no puede exceder 15 caracteres',
    'home.error.invalidChars': 'El nombre solo puede contener letras, números y espacios',
    'home.error.alreadyOwner': 'Ya eres el propietario de esta agenda',
    'home.error.privateKey': 'La llave de esta agenda es privada',
    'home.error.alreadyMember': 'Ya eres miembro de esta agenda',
    'home.success.joined': '¡Te has unido exitosamente a la agenda "{name}"!',
    'home.success.created': '¡Agenda creada exitosamente!',
    'home.keyCopied': 'Clave de agenda copiada al portapapeles',
    'completed.tapToUncomplete': 'Toca para desmarcar',
    'settings.theme': 'Tema',
    'settings.theme.light': 'Claro',
    'settings.theme.dark': 'Oscuro',
    'settings.theme.system': 'Sistema',
    'common.offline': 'Estás desconectado',
    'calendar.header': 'Vista de Calendario',
    'calendar.noEvents': 'No hay eventos este día',
    'calendar.days.sun': 'Dom',
    'calendar.days.mon': 'Lun',
    'calendar.days.tue': 'Mar',
    'calendar.days.wed': 'Mié',
    'calendar.days.thu': 'Jue',
    'calendar.days.fri': 'Vie',
    'calendar.days.sat': 'Sáb',
    'calendar.allSections': 'Todas las Secciones',
    'calendar.weekView': 'Semana',
    'calendar.monthView': 'Mes',
    'calendar.months.jan': 'Enero',
    'calendar.months.feb': 'Febrero',
    'calendar.months.mar': 'Marzo',
    'calendar.months.apr': 'Abril',
    'calendar.months.may': 'Mayo',
    'calendar.months.jun': 'Junio',
    'calendar.months.jul': 'Julio',
    'calendar.months.aug': 'Agosto',
    'calendar.months.sep': 'Septiembre',
    'calendar.months.oct': 'Octubre',
    'calendar.months.nov': 'Noviembre',
    'calendar.months.dec': 'Diciembre',
    'home.notLoggedIn': 'Bienvenido a Aghendi',
    'home.loginRequired': 'Por favor inicia sesión para ver y administrar tus agendas',
    'home.goToLogin': 'Ir a Iniciar Sesión',
    'comments.readMore': 'Leer más',
    'comments.showLess': 'Ver menos',
    'notifications.newReaction': '¡Nueva Reacción!',
    'notifications.reactionReceived': '¡{username} ha reaccionado con un {reaction} a tu perfil!',
    'reactions.hug': 'abrazo',
    'reactions.heart': 'corazón',
    'reactions.kiss': 'beso',
    'agenda.you': 'Tú',
    'auth.error.invalidLogin': 'Correo o contraseña inválidos',
    'auth.error.emailInUse': 'El correo ya está en uso',
    'auth.error.weakPassword': 'La contraseña es demasiado débil',
    'auth.error.invalidEmail': 'Formato de correo inválido',
    'auth.error.missingFields': 'Por favor complete todos los campos',
    'auth.error.generic': 'Ocurrió un error. Por favor intente de nuevo',
  },
  fr: {
    'settings.title': 'Paramètres du Compte',
    'settings.profile': 'Information du Profil',
    'settings.language': 'Langue',
    'settings.statistics': 'Statistiques',
    'settings.dangerZone': 'Zone Dangereuse',
    'settings.deleteAccount': 'Supprimer le Compte',
    'settings.signOut': 'Se Déconnecter',
    'settings.save': 'Enregistrer',
    'settings.email': 'Email',
    'settings.username': 'Nom d\'Utilisateur',
    'settings.description': 'Description',
    'settings.accountCreated': 'Compte Créé',
    'settings.lastActive': 'Dernière Activité',
    'settings.totalReactionsReceived': 'Réactions Reçues',
    'settings.totalReactionsSent': 'Réactions Envoyées',
    'settings.totalComments': 'Commentaires Totals',
    'settings.creditsAvailable': 'Crédits Disponibles',
    'settings.dangerZoneWarning': 'Cette action ne peut pas être annulée. Toutes vos données seront supprimées définitivement.',
    'settings.deleteConfirmTitle': 'Supprimer le Compte',
    'settings.deleteConfirmMessage': 'Cela supprimera définitivement votre compte et toutes les données associées. Cette action ne peut pas être annulée. Êtes-vous sûr?',
    'settings.cancel': 'Annuler',
    'settings.delete': 'Supprimer',
    'settings.success': 'Succès',
    'settings.successMessage': 'Profil mis à jour avec succès!',
    'settings.error': 'Erreur',
    'settings.errorProfile': 'Échec de la mise à jour du profil',
    'settings.errorSignOut': 'Échec de la déconnexion',
    'settings.errorDelete': 'Échec de la suppression du compte',
    'profile.loading': 'Chargement du profil...',
    'profile.welcomeBack': 'Bon Retour',
    'profile.createAccount': 'Créer un Compte',
    'profile.email': 'Email',
    'profile.password': 'Mot de passe',
    'profile.signIn': 'Se connecter',
    'profile.signUp': "S'inscrire",
    'profile.switchToSignUp': 'Besoin d\'un compte? Inscrivez-vous',
    'profile.switchToSignIn': 'Déjà un compte? Connectez-vous',
    'profile.noDescription': 'Pas de description',
    'profile.addDescription': 'Ajouter une description...',
    'profile.comments': 'Commentaires',
    'profile.addComment': 'Ajouter un commentaire...',
    'profile.noComments': 'Pas encore de commentaires. Soyez le premier à commenter !',
    'profile.error.session': 'Échec de l\'initialisation de la session',
    'profile.error.profile': 'Échec du chargement du profil',
    'profile.error.signOut': 'Échec de la déconnexion. Veuillez réessayer.',
    'profile.error.image': 'Échec de la sélection de l\'image',
    'profile.error.fields': 'Veuillez remplir tous les champs',
    'profile.commentsDisabled': 'Les commentaires sont désactivés pour ce profil',
    'profile.emailPlaceholder': 'email@exemple.com',
    'profile.passwordPlaceholder': 'Mot de passe',
    'profile.error.invalidEmail': 'Veuillez entrer une adresse email valide',
    'profile.error.passwordTooShort': 'Le mot de passe doit contenir au moins 6 caractères',
    'feed.loading': 'Chargement du fil...',
    'userList.loading': 'Chargement des utilisateurs...',
    'userList.noUsers': 'Aucun utilisateur trouvé',
    'userProfile.loading': 'Chargement du profil...',
    'userProfile.notFound': 'Profil non trouvé',
    'userProfile.noDescription': 'Pas de description',
    'userProfile.comments': 'Commentaires',
    'userProfile.addComment': 'Ajouter un commentaire...',
    'userProfile.noComments': 'Pas encore de commentaires. Soyez le premier à commenter !',
    'userProfile.leaveAgenda': 'Quitter l\'Agenda',
    'userProfile.leaveConfirm': 'Êtes-vous sûr de vouloir quitter cet agenda ? Cela supprimera toutes vos données de cet agenda.',
    'userProfile.error.reaction': 'Échec du traitement de la réaction',
    'userProfile.error.comment': 'Échec de la publication du commentaire',
    'userProfile.error.insufficientVibes': 'Vibes Insuffisants',
    'userProfile.error.insufficientVibesDesc': 'Vous avez besoin de {amount} Vibes pour envoyer cette réaction. Voulez-vous en obtenir plus ?',
    'userProfile.action.getVibes': 'Obtenir des Vibes',
    'userProfile.action.viewAgenda': 'Voir',
    'store.comingSoon': 'Bientôt Disponible',
    'store.comingSoonDesc': 'Les paiements seront disponibles dans une future mise à jour !',
    'store.error': 'Erreur',
    'store.errorPurchase': 'Échec du traitement de l\'achat',
    'store.bestValue': 'MEILLEUR PRIX',
    'store.bundle.starter': 'Pack Débutant',
    'store.bundle.popular': 'Pack Populaire',
    'store.bundle.super': 'Pack Super',
    'store.bundle.mega': 'Pack Méga',
    'modal.settings': 'Paramètres',
    'modal.urgent': 'Éléments Urgents',
    'modal.profile': 'Profil',
    'modal.completed': 'Éléments Terminés',
    'modal.members': 'Gérer les Membres',
    'modal.store': 'Boutique',
    'modal.calendar': 'Calendrier',
    'tabs.home': 'Accueil',
    'tabs.feed': 'Flux',
    'tabs.profile': 'Profil',
    'agenda.loading': 'Chargement de l\'agenda...',
    'agenda.notFound': 'Agenda non trouvé',
    'agenda.addSection': 'Ajouter Section',
    'agenda.newSection': 'Nouvelle Section',
    'agenda.cancel': 'Annuler',
    'agenda.add': 'Ajouter',
    'agenda.addElement': 'Ajouter Élément',
    'agenda.elementSubject': 'Sujet',
    'agenda.elementDetails': 'Détails (optionnel)',
    'agenda.elementDeadline': 'Échéance (AAAA-MM-JJ)',
    'agenda.deleteSection': 'Supprimer Section',
    'agenda.deleteSectionConfirm': 'Êtes-vous sûr de vouloir supprimer "{name}" ? Cela supprimera également tous les éléments de cette section.',
    'agenda.deleteElement': 'Supprimer Élément',
    'agenda.deleteElementConfirm': 'Êtes-vous sûr de vouloir supprimer "{name}" ?',
    'agenda.deleteAgenda': 'Supprimer Agenda',
    'agenda.deleteAgendaConfirm': 'Cela supprimera définitivement cet agenda et tout son contenu. Cette action ne peut pas être annulée.',
    'agenda.leaveAgenda': 'Quitter',
    'agenda.leaveAgendaConfirm': 'Êtes-vous sûr de vouloir quitter cet agenda ? Cela supprimera toutes vos données de cet agenda.',
    'agenda.members': 'Membres ({count})',
    'agenda.comments': 'Commentaires',
    'agenda.addComment': 'Ajouter un commentaire...',
    'agenda.noComments': 'Pas encore de commentaires. Soyez le premier à commenter !',
    'agenda.commentsDisabled': 'Les commentaires sont désactivés pour cet agenda',
    'agenda.error': 'Erreur',
    'agenda.noElements': 'Aucun élément dans cette section',
    'agenda.viewCompleted': 'Voir Terminés ({count})',
    'agenda.noSections': 'Aucune section',
    'agenda.due': 'Pour le',
    'agenda.header': 'Agenda',
    'agenda.errorLeave': 'Échec pour quitter l\'agenda',
    'agenda.error.sectionNameTooLong': 'Le nom de la section ne peut pas dépasser 15 caractères',
    'agenda.error.sectionNameInvalid': 'Le nom ne peut contenir que des lettres, des chiffres et des espaces',
    'agenda.error.elementSubjectTooLong': 'Le sujet de l\'élément ne peut pas dépasser 15 caractères',
    'agenda.error.elementSubjectInvalid': 'Le sujet ne peut contenir que des lettres, des chiffres et des espaces',
    'agenda.editElement': 'Modifier Élément',
    'agenda.save': 'Enregistrer',
    'agenda.errorEditElement': 'Échec pour modifier l\'élément',
    'agenda.deleteMemberConfirm': 'Êtes-vous sûr de vouloir supprimer ce membre ? Cela supprimera toutes ses données de cet agenda.',
    'time.now': 'À l\'instant',
    'time.seconds': 'Il y a {n}s',
    'time.minutes': 'Il y a {n}m',
    'time.hours': 'Il y a {n}h',
    'time.days': 'Il y a {n}j',
    'time.months': 'Il y a {n}m',
    'time.years': 'Il y a {n}a',
    'members.creator': 'Créateur',
    'members.editor': 'Éditeur',
    'members.member': 'Membre',
    'members.promote': 'Promouvoir',
    'members.demote': 'Rétrograder',
    'members.loading': 'Chargement des membres...',
    'home.viewAgenda': 'Voir dans l\'Agenda',
    'home.welcome': 'Bienvenue',
    'home.create': 'Créer',
    'home.join': 'Rejoindre',
    'home.agendas': 'Vos Agendas',
    'home.noAgendas': 'Pas encore d\'agendas',
    'home.createAgenda': 'Créer un Agenda',
    'home.joinAgenda': 'Rejoindre Agenda',
    'home.createAgendaTitle': 'Créer un Nouvel Agenda',
    'home.agendaName': 'Nom de l\'Agenda',
    'home.joinAgendaTitle': 'Rejoindre un Agenda',
    'home.agendaCode': 'Clé',
    'home.validCode': 'Code valide',
    'home.invalidCode': 'Code invalide',
    'home.error.create': 'Échec de la création de l\'agenda',
    'home.error.join': 'Échec pour rejoindre l\'agenda',
    'home.error.fetch': 'Échec du chargement des agendas',
    'home.loading': 'Chargement...',
    'home.atype': 'Rendre Publique',
    'home.error.nameTooLong': "Le nom de l'agenda ne peut pas dépasser 15 caractères",
    'home.error.invalidChars': 'Le nom ne peut contenir que des lettres, des chiffres et des espaces',
    'home.error.alreadyOwner': 'Vous êtes déjà le propriétaire de cet agenda',
    'home.error.privateKey': 'La clé de cet agenda est privée',
    'home.error.alreadyMember': 'Vous êtes déjà membre de cet agenda',
    'home.success.joined': 'Vous avez rejoint l\'agenda "{name}" avec succès !',
    'home.success.created': 'Agenda créé avec succès !',
    'home.keyCopied': 'Clé d\'agenda copiée dans le presse-papiers',
    'completed.tapToUncomplete': 'Appuyez pour décocher',
    'settings.theme': 'Thème',
    'settings.theme.light': 'Clair',
    'settings.theme.dark': 'Sombre',
    'settings.theme.system': 'Système',
    'common.offline': 'Vous êtes hors ligne',
    'calendar.header': 'Vue Calendrier',
    'calendar.noEvents': 'Pas d\'événements ce jour',
    'calendar.days.sun': 'Dim',
    'calendar.days.mon': 'Lun',
    'calendar.days.tue': 'Mar',
    'calendar.days.wed': 'Mer',
    'calendar.days.thu': 'Jeu',
    'calendar.days.fri': 'Ven',
    'calendar.days.sat': 'Sam',
    'calendar.allSections': 'Toutes les Sections',
    'calendar.weekView': 'Semaine',
    'calendar.monthView': 'Mois',
    'calendar.months.jan': 'Janvier',
    'calendar.months.feb': 'Février',
    'calendar.months.mar': 'Mars',
    'calendar.months.apr': 'Avril',
    'calendar.months.may': 'Mai',
    'calendar.months.jun': 'Juin',
    'calendar.months.jul': 'Juillet',
    'calendar.months.aug': 'Août',
    'calendar.months.sep': 'Septembre',
    'calendar.months.oct': 'Octobre',
    'calendar.months.nov': 'Novembre',
    'calendar.months.dec': 'Décembre',
    'home.notLoggedIn': 'Bienvenue sur Aghendi',
    'home.loginRequired': 'Veuillez vous connecter pour voir et gérer vos agendas',
    'home.goToLogin': 'Aller à la Connexion',
    'comments.readMore': 'Lire la suite',
    'comments.showLess': 'Voir moins',
    'notifications.newReaction': 'Nouvelle Réaction !',
    'notifications.reactionReceived': '{username} a réagi avec un {reaction} à votre profil !',
    'reactions.hug': 'câlin',
    'reactions.heart': 'cœur',
    'reactions.kiss': 'bisou',
    'agenda.you': 'Vous',
    'auth.error.invalidLogin': 'Email ou mot de passe invalide',
    'auth.error.emailInUse': 'Cet email est déjà utilisé',
    'auth.error.weakPassword': 'Le mot de passe est trop faible',
    'auth.error.invalidEmail': 'Format d\'email invalide',
    'auth.error.missingFields': 'Veuillez remplir tous les champs',
    'auth.error.generic': 'Une erreur est survenue. Veuillez réessayer',
  }
};
