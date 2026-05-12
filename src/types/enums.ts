export enum CustomStatus {
    Todo = " ", // #task `space` to-do
    Slash = "/", // #task `/` incomplete
    Done = "x",     // #task `x` done
    Dash = "-",  // #task `-` canceled
    Greater = ">", // #task `>` forwarded
    Less = "<",  // #task `<` scheduling
    Question = "?", // #task `?` question
    Exclamation = "!", // #task `!` important
    Star = "*",  // #task `*` star
    Quote = "\"", // #task `"` quote
    Location = "l", // #task `l` location
    Bookmark = "b", // #task `b` bookmark
    Information = "i", // #task `i` information
    Savings = "S", // #task `S` savings
    Idea = "I",   // #task `I` idea
    Pros = "p",   // #task `p` pros
    Cons = "c",   // #task `c` cons
    Fire = "f",   // #task `f` fire
    Key = "k",    // #task `k` key
    Win = "w",    // #task `w` win
    Up = "u",     // #task `u` up
    Down = "d"    // #task `d` down
}

export enum CoreTaskStatus {
  Todo = " ",
  InProgress = "/",
  Done = "x",
  Cancelled = "-",
  nonTask = "~"
}

export enum CoreTaskStatusIcon {
  Todo = "⭕",
  InProgress = "🛠️",
  Done = "✅",
  Cancelled = "❌",
  nonTask = "🗑️"
}

export enum OnCompletion {
  Keep = "keep",
  Delete = "delete"
}

export enum TaskPriority {
  Lowest = "lowest",
  Low = "low",
  Normal = "normal",
  Medium = "medium",
  High = "high",
  Highest = "highest"
}

export enum TaskPriorityIcon {
  Lowest = "⏬",
  Low = "🔽", 
  Normal = "▶️", // Sin ícono específico
  Medium = "🔼",
  High = "⏫",
  Highest = "🔺"
}

export enum TaskDateType {
  Created = "➕",
  Start = "🛫",
  Scheduled = "⏳",
  Due = "📅",
  Done = "✅",
  Cancelled = "❌"
}

export enum TaskMisc {
  Recurrence = "🔁",
  ID = "🆔", 
  Blocked = "⛔",
  Completion = "🏁"
}

export enum CalendarViewType {
  Year = 'year',
  Month = 'month',
  Week = 'week',
  WorkWeek = 'workweek',
  Day = 'day'
}

// Otras enumeraciones pueden ir aquí
