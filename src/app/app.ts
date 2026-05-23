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

export interface Area {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
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
  areas = signal<Area[]>([]);
  filter = signal<'all' | 'active' | 'completed'>('all');
  categoryFilter = signal<string>('all');
  priorityFilter = signal<string>('all');
  searchQuery = signal<string>('');
  sortBy = signal<'date' | 'dueDate' | 'priority' | 'title'>('date');
  editingId = signal<string | null>(null);
  editingTitle = signal<string>('');

  // Area Configuration Panel Overlay State
  showAreasConfig = signal<boolean>(false);
  
  // Custom Area Creator Fields
  newAreaName = signal<string>('');
  newAreaColor = signal<string>('indigo');
  newAreaIcon = signal<string>('folder');

  // Custom Area Editor State
  editingAreaId = signal<string | null>(null);
  areaFormName = signal<string>('');
  areaFormColor = signal<string>('indigo');
  areaFormIcon = signal<string>('folder');

  // Selector presets
  presetColors = ['indigo', 'emerald', 'purple', 'amber', 'rose', 'sky', 'orange', 'teal', 'pink', 'slate'];
  presetIcons = ['work', 'person_outline', 'shopping_bag', 'lightbulb_outline', 'error_outline', 'star', 'schedule', 'folder', 'home', 'travel_explore'];

  // Form Group for creating new item
  todoForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
    priority: ['medium', [Validators.required]],
    category: ['', [Validators.required]],
    dueDate: [''],
  });

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      // 1. Load initial areas from localStorage or seed
      const savedAreas = localStorage.getItem('todo_areas_storage');
      if (savedAreas) {
        try {
          this.areas.set(JSON.parse(savedAreas));
        } catch (e) {
          console.error('Failed to parse areas', e);
          this.seedAreas();
        }
      } else {
        this.seedAreas();
      }

      // 2. Load initial todos from localStorage or seed
      const savedTodos = localStorage.getItem('todo_items_storage');
      if (savedTodos) {
        try {
          this.todos.set(JSON.parse(savedTodos));
        } catch (e) {
          console.error('Failed to parse todos', e);
          this.seedTodos();
        }
      } else {
        this.seedTodos();
      }

      // Default Category initialization
      if (this.areas().length > 0) {
        this.todoForm.patchValue({ category: this.areas()[0].id });
      }

      // Sync signals to localStorage on changes
      effect(() => {
        localStorage.setItem('todo_areas_storage', JSON.stringify(this.areas()));
      });

      effect(() => {
        localStorage.setItem('todo_items_storage', JSON.stringify(this.todos()));
      });
    } else {
      // Server-side fallback seeds
      this.seedAreas();
      this.seedTodos();
      if (this.areas().length > 0) {
        this.todoForm.patchValue({ category: this.areas()[0].id });
      }
    }
  }

  private seedAreas() {
    this.areas.set([
      { id: 'work', name: 'Work Tasks', color: 'indigo', icon: 'work' },
      { id: 'personal', name: 'Personal Care', color: 'emerald', icon: 'person_outline' },
      { id: 'shopping', name: 'Shopping Lists', color: 'purple', icon: 'shopping_bag' },
      { id: 'ideas', name: 'Ideas & Drafts', color: 'amber', icon: 'lightbulb_outline' },
      { id: 'urgent', name: 'Urgent Priorities', color: 'rose', icon: 'error_outline' },
    ]);
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
        id: '4',
        title: 'Schedule dentist routine checkup',
        description: 'Bi-annual scaling appointment with Dr. Samantha in the wellness complex.',
        completed: false,
        priority: 'medium',
        category: 'personal',
        dueDate: '2026-06-02',
        createdAt: Date.now() - 14400000,
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

  // Areas Styling Help helpers
  getAreaBadgeClasses(color: string): string {
    const classes: Record<string, string> = {
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      purple: 'bg-purple-50 text-purple-700 border-purple-100',
      amber: 'bg-amber-50 text-amber-700 border-amber-100',
      rose: 'bg-rose-50 text-rose-700 border-rose-100',
      sky: 'bg-sky-50 text-sky-700 border-sky-100',
      orange: 'bg-orange-50 text-orange-700 border-orange-100',
      teal: 'bg-teal-50 text-teal-700 border-teal-100',
      pink: 'bg-pink-50 text-pink-700 border-pink-100',
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return classes[color] || classes['indigo'];
  }

  getAreaBgClasses(color: string): string {
    const classes: Record<string, string> = {
      indigo: 'bg-indigo-600',
      emerald: 'bg-emerald-600',
      purple: 'bg-purple-600',
      amber: 'bg-amber-600',
      rose: 'bg-rose-600',
      sky: 'bg-sky-600',
      orange: 'bg-orange-600',
      teal: 'bg-teal-600',
      pink: 'bg-pink-600',
      slate: 'bg-slate-600',
    };
    return classes[color] || classes['indigo'];
  }

  getRingClass(color: string): string {
    const classes: Record<string, string> = {
      indigo: 'ring-indigo-400',
      emerald: 'ring-emerald-400',
      purple: 'ring-purple-400',
      amber: 'ring-amber-400',
      rose: 'ring-rose-400',
      sky: 'ring-sky-400',
      orange: 'ring-orange-400',
      teal: 'ring-teal-400',
      pink: 'ring-pink-400',
      slate: 'ring-slate-400',
    };
    return classes[color] || classes['indigo'];
  }

  getAreaById(id: string): Area | undefined {
    return this.areas().find((a) => a.id === id);
  }

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

    const defaultCategory = this.areas().length > 0 ? this.areas()[0].id : '';

    // Reset keeping default configuration values
    this.todoForm.patchValue({
      title: '',
      description: '',
      priority: 'medium',
      category: defaultCategory,
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

  // Area Configuration Actions
  openAreasConfig() {
    this.showAreasConfig.set(true);
    this.cancelAreaEdit();
  }

  closeAreasConfig() {
    this.showAreasConfig.set(false);
  }

  createArea() {
    const name = this.newAreaName().trim();
    if (!name) return;

    const newId = 'area-' + Math.random().toString(36).substring(2, 9);
    const newArea: Area = {
      id: newId,
      name,
      color: this.newAreaColor(),
      icon: this.newAreaIcon(),
    };

    this.areas.update((old) => [...old, newArea]);

    // Reset creators
    this.newAreaName.set('');
    this.newAreaColor.set('indigo');
    this.newAreaIcon.set('folder');

    // Auto-patch current form category to ensure valid options
    this.todoForm.patchValue({ category: newId });
  }

  startEditingArea(area: Area) {
    this.editingAreaId.set(area.id);
    this.areaFormName.set(area.name);
    this.areaFormColor.set(area.color);
    this.areaFormIcon.set(area.icon);
  }

  saveAreaEdit(id: string) {
    const name = this.areaFormName().trim();
    if (!name) return;

    this.areas.update((old) =>
      old.map((area) =>
        area.id === id
          ? {
              ...area,
              name,
              color: this.areaFormColor(),
              icon: this.areaFormIcon(),
            }
          : area
      )
    );

    this.cancelAreaEdit();
  }

  cancelAreaEdit() {
    this.editingAreaId.set(null);
    this.areaFormName.set('');
    this.areaFormColor.set('indigo');
    this.areaFormIcon.set('folder');
  }

  deleteArea(id: string) {
    if (this.areas().length <= 1) {
      // Direct warning inside simple visual area log
      return;
    }

    this.areas.update((old) => {
      const remaining = old.filter((a) => a.id !== id);
      const fallbackId = remaining[0]?.id || '';

      // Set category of existing todos belonging to this area to fallbackId
      this.todos.update((oldTodos) =>
        oldTodos.map((todo) =>
          todo.category === id ? { ...todo, category: fallbackId } : todo
        )
      );

      // Reset Active Filter Category
      if (this.categoryFilter() === id) {
        this.categoryFilter.set('all');
      }

      // Repair reactive form default selection
      if (this.todoForm.get('category')?.value === id) {
        this.todoForm.patchValue({ category: fallbackId });
      }

      return remaining;
    });
  }
}
