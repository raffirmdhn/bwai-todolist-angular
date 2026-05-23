import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'work' | 'personal' | 'shopping' | 'ideas' | 'urgent';
  dueDate?: string;
  createdAt: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private fb = inject(FormBuilder);
  private isBrowser: boolean;

  // Signal state
  todos = signal<Todo[]>([]);
  filter = signal<'all' | 'active' | 'completed'>('all');
  categoryFilter = signal<string>('all');
  priorityFilter = signal<string>('all');
  searchQuery = signal<string>('');
  sortBy = signal<'date' | 'dueDate' | 'priority' | 'title'>('date');
  editingId = signal<string | null>(null);
  editingTitle = signal<string>('');

  // Form Group for creating new item
  todoForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
    priority: ['medium', [Validators.required]],
    category: ['work', [Validators.required]],
    dueDate: [''],
  });

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      // Load initial todos from localStorage or seed
      const saved = localStorage.getItem('todo_items_storage');
      if (saved) {
        try {
          this.todos.set(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse todos', e);
          this.seedTodos();
        }
      } else {
        this.seedTodos();
      }

      // Sync signal to localStorage on changes
      effect(() => {
        localStorage.setItem('todo_items_storage', JSON.stringify(this.todos()));
      });
    } else {
      // Server-side fallback seed
      this.seedTodos();
    }
  }

  private seedTodos() {
    this.todos.set([
      {
        id: '1',
        title: 'Design high-fidelity dashboard',
        description: 'Prepare clean layout prototypes in Inter and Space Grotesk detailing tasks overview.',
        completed: false,
        priority: 'high',
        category: 'work',
        dueDate: '2026-05-25',
        createdAt: Date.now() - 3600000,
      },
      {
        id: '2',
        title: 'Replenish study supplies',
        description: 'Pick up notebooks, fine-point markers, and a desk lamp organizer.',
        completed: true,
        priority: 'low',
        category: 'shopping',
        dueDate: '2026-05-22',
        createdAt: Date.now() - 7200000,
      },
      {
        id: '3',
        title: 'Gather ideas for creative writing',
        description: 'Draft the opening outline detailing futuristic floating cities under visual neon domes.',
        completed: false,
        priority: 'medium',
        category: 'ideas',
        dueDate: '2026-05-28',
        createdAt: Date.now() - 10800000,
      },
      {
        id: '4',
        title: 'Schedule dentist routine checkup',
        description: 'Bi-annual scaling appointment with Dr. Samantha in the wellness complex.',
        completed: false,
        priority: 'medium',
        category: 'personal',
        dueDate: '2026-06-02',
        createdAt: Date.now() - 14400000,
      },
    ] as Todo[]);
  }

  // Derived Computed signals
  totalCount = computed(() => this.todos().length);
  completedCount = computed(() => this.todos().filter((t) => t.completed).length);
  activeCount = computed(() => this.totalCount() - this.completedCount());
  completionRate = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.completedCount() / total) * 100) : 0;
  });

  filteredTodos = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const activeFilter = this.filter();
    const activeCategory = this.categoryFilter();
    const activePriority = this.priorityFilter();
    const activeSort = this.sortBy();

    let list = this.todos();

    // 1. Search Query
    if (query) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
      );
    }

    // 2. Status Filter
    if (activeFilter === 'active') {
      list = list.filter((t) => !t.completed);
    } else if (activeFilter === 'completed') {
      list = list.filter((t) => t.completed);
    }

    // 3. Category Filter
    if (activeCategory !== 'all') {
      list = list.filter((t) => t.category === activeCategory);
    }

    // 4. Priority Filter
    if (activePriority !== 'all') {
      list = list.filter((t) => t.priority === activePriority);
    }

    // 5. Sorting
    return [...list].sort((a, b) => {
      if (activeSort === 'date') {
        return b.createdAt - a.createdAt;
      } else if (activeSort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (activeSort === 'priority') {
        const priorityWeights = { high: 3, medium: 2, low: 1 };
        return priorityWeights[b.priority] - priorityWeights[a.priority];
      } else if (activeSort === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  });

  // Actions
  addTodo() {
    if (this.todoForm.invalid) return;

    const val = this.todoForm.value;
    const newTodo: Todo = {
      id: Math.random().toString(36).substring(2, 9),
      title: val.title.trim(),
      description: val.description ? val.description.trim() : '',
      completed: false,
      priority: val.priority,
      category: val.category,
      dueDate: val.dueDate || undefined,
      createdAt: Date.now(),
    };

    this.todos.update((old) => [newTodo, ...old]);

    // Reset keeping default configuration values
    this.todoForm.patchValue({
      title: '',
      description: '',
      priority: 'medium',
      category: 'work',
      dueDate: '',
    });
    this.todoForm.get('title')?.markAsPristine();
    this.todoForm.get('title')?.markAsUntouched();
  }

  toggleTodo(id: string) {
    this.todos.update((old) =>
      old.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  deleteTodo(id: string) {
    this.todos.update((old) => old.filter((t) => t.id !== id));
  }

  clearCompleted() {
    this.todos.update((old) => old.filter((t) => !t.completed));
  }

  startEditing(todo: Todo) {
    this.editingId.set(todo.id);
    this.editingTitle.set(todo.title);
  }

  saveEdit(id: string) {
    const title = this.editingTitle().trim();
    if (title) {
      this.todos.update((old) =>
        old.map((t) => (t.id === id ? { ...t, title } : t))
      );
    }
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editingTitle.set('');
  }

  updateTodoPriority(id: string, priority: 'low' | 'medium' | 'high') {
    this.todos.update((old) =>
      old.map((t) => (t.id === id ? { ...t, priority } : t))
    );
  }
}

