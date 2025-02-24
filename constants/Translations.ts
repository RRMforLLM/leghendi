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
  | 'home.loading'
  | 'home.atype'
  | 'home.validCode'
  | 'home.invalidCode'
  | 'home.error.create'
  | 'home.error.join'
  | 'home.error.fetch'
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
  | 'completed.tapToUncomplete';

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
    'completed.tapToUncomplete': 'Tap to uncomplete',
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
    'completed.tapToUncomplete': 'Toca para desmarcar',
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
    'completed.tapToUncomplete': 'Appuyez pour décocher',
  }
};
