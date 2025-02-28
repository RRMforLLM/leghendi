export interface Agenda {
  id: string;
  name: string;
  key: string;
  key_visible: boolean;
  creator_id: string;
  created_at: string;
  isCreator?: boolean;
}

export interface AgendaElement {
  id: string;
  subject: string;
  details?: string;
  deadline: string;
  status: string;
  section_id: string;
  created_at: string;
}

export interface AgendaSection {
  id: string;
  name: string;
  agenda_id: string;
  created_at: string;
}

export interface AgendaWithSections extends Agenda {
  sections: AgendaSectionWithElements[];
}

export interface AgendaSectionWithElements extends AgendaSection {
  elements: AgendaElement[];
}
