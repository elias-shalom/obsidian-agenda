import { ITask, ITaskFile, ITaskLine, ITaskState, ITaskDate, ITaskSection, ITaskWorkflow } from "../types/interfaces";
import { DateTime } from 'luxon';
import { CoreTaskStatus } from "../types/enums";

export class Task implements ITask {
  id: string;
  file: ITaskFile;
  line: ITaskLine;
  state: ITaskState;
  date: ITaskDate;
  section: ITaskSection;
  workflow: ITaskWorkflow;
  groupLabel?: string;

  constructor(
    id: string,
    file: ITaskFile,
    line: ITaskLine,
    state: ITaskState,
    date: ITaskDate,
    section: ITaskSection,
    workflow: ITaskWorkflow,
    groupLabel?: string
  ) {
    this.id = id;
    this.file = file;
    this.line = line;
    this.state = state;
    this.date = date;
    this.section = section;
    this.workflow = workflow;
    this.groupLabel = groupLabel;
  }

  // Getters para compatibilidad hacia atrás (deprecated)
  get filePath(): string { return this.file.path; }
  get fileName(): string { return `${this.file.basename}.${this.file.extension}`; }
  get fileBasename(): string { return this.file.basename; }
  get rootFolder(): string { return this.file.root; }
  get title(): string { return this.line.text; }
  get text(): string { return this.line.text; }
  get lineNumber(): number { return this.line.number; }
  get status(): string { return this.state.status; }
  get statusIcon(): string { return this.state.icon; }
  get statusText(): string { return this.state.text; }
  get tags(): string[] { return this.section.tags; }
  get priority(): string { return this.state.priority; }
  get createdDate(): DateTime | null { return this.date.created; }
  get startDate(): DateTime | null { return this.date.start; }
  get scheduledDate(): DateTime | null { return this.date.scheduled; }
  get dueDate(): DateTime | null { return this.date.due; }
  get doneDate(): DateTime | null { return this.date.done; }
  get cancelledDate(): DateTime | null { return this.date.cancelled; }
  get recurrence(): string { return this.workflow.recurrence; }
  get onCompletion(): string | null { return this.workflow.onCompletion; }
  get dependsOn(): string[] { return this.workflow.dependsOn; }
  get blockLink(): string { return this.workflow.blockLink; }
  get header(): string { return this.section.header; }
  get description(): string { return this.section.description; }
  get tasksFields(): string[] { return this.section.fields; }
  get isValid(): boolean { return this.state.isValid; }

  // Objeto de compatibilidad para taskData
  get taskData(): Record<string, any> {
    return {
      id: this.id,
      priority: this.state.priority,
      dueDate: this.date.due,
      startDate: this.date.start,
      scheduledDate: this.date.scheduled,
      createdDate: this.date.created,
      doneDate: this.date.done,
      cancelledDate: this.date.cancelled,
      recurrence: this.workflow.recurrence,
      onCompletion: this.workflow.onCompletion,
      dependsOn: this.workflow.dependsOn,
      isValid: this.state.isValid
    };
  }

  /**
   * Extrae el estado de la tarea desde el texto del header.
   */
  static extractStatusFromHeader(headerText: string): CoreTaskStatus {
    const statusMatch = headerText.match(/\[(.)\]/);

    if (statusMatch && statusMatch[1]) {
      const statusChar = statusMatch[1];

      if (Object.values(CoreTaskStatus).includes(statusChar as CoreTaskStatus)) {
          return statusChar as CoreTaskStatus;
      }
    }

    return CoreTaskStatus.Todo;
  }

  /**
   * Extrae los tags del texto de una tarea.
   */
  static extractTags(text: string): string[] {
    const tagRegex = /#[a-zA-Z0-9_\-/]+/g;
    const tagMatches = text.match(tagRegex) || [];
    return tagMatches.map(tag => tag.trim());
  }

  /**
   * Factory method para crear una tarea con la nueva estructura
   */
  static create(data: {
    id: string;
    file: ITaskFile;
    line: ITaskLine;
    state: ITaskState;
    date: ITaskDate;
    section: ITaskSection;
    workflow: ITaskWorkflow;
    groupLabel?: string;
  }): Task {
    return new Task(
      data.id,
      data.file,
      data.line,
      data.state,
      data.date,
      data.section,
      data.workflow,
      data.groupLabel
    );
  }
}