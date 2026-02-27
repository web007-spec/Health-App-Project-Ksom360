import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  CircleDot,
  CheckSquare,
  AlignLeft,
  Star,
  X,
} from "lucide-react";

export interface FormQuestionOption {
  id: string;
  label: string;
}

export interface FormQuestion {
  id: string;
  type: "single_answer" | "multiple_answer" | "text_answer" | "rating";
  question: string;
  options: FormQuestionOption[];
  required: boolean;
}

const questionTypeConfig = {
  single_answer: { label: "Single Answer", icon: CircleDot, color: "text-blue-600", bg: "bg-blue-100" },
  multiple_answer: { label: "Multiple Answers", icon: CheckSquare, color: "text-green-600", bg: "bg-green-100" },
  text_answer: { label: "Text Answer", icon: AlignLeft, color: "text-amber-600", bg: "bg-amber-100" },
  rating: { label: "Rate (1 - 10)", icon: Star, color: "text-purple-600", bg: "bg-purple-100" },
};

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

interface FormQuestionBuilderProps {
  questions: FormQuestion[];
  onChange: (questions: FormQuestion[]) => void;
}

export function FormQuestionBuilder({ questions, onChange }: FormQuestionBuilderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addQuestion = (type: FormQuestion["type"]) => {
    const newQuestion: FormQuestion = {
      id: generateId(),
      type,
      question: "",
      options: type === "single_answer" || type === "multiple_answer"
        ? [
            { id: generateId(), label: "" },
            { id: generateId(), label: "" },
          ]
        : [],
      required: false,
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<FormQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const duplicateQuestion = (index: number) => {
    const original = questions[index];
    const duplicate: FormQuestion = {
      ...original,
      id: generateId(),
      options: original.options.map((o) => ({ ...o, id: generateId() })),
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, duplicate);
    onChange(updated);
  };

  const addOption = (questionIndex: number) => {
    const q = questions[questionIndex];
    if (q.options.length >= 7) return;
    updateQuestion(questionIndex, {
      options: [...q.options, { id: generateId(), label: "" }],
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, label: string) => {
    const q = questions[questionIndex];
    const options = [...q.options];
    options[optionIndex] = { ...options[optionIndex], label };
    updateQuestion(questionIndex, { options });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const q = questions[questionIndex];
    if (q.options.length <= 1) return;
    updateQuestion(questionIndex, {
      options: q.options.filter((_, i) => i !== optionIndex),
    });
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...questions];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    onChange(updated);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Question type selector panel */}
      <div className="rounded-lg border p-3 bg-muted/30">
        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
          Add Question Type
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(questionTypeConfig) as [FormQuestion["type"], typeof questionTypeConfig.single_answer][]).map(
            ([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => addQuestion(type)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary hover:shadow-sm transition-all cursor-pointer bg-background"
                >
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground text-center leading-tight">
                    {config.label}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Questions list */}
      {questions.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            No questions yet. Click a question type above to start building your form.
          </p>
        </div>
      )}

      {questions.map((q, index) => {
        const config = questionTypeConfig[q.type];
        const Icon = config.icon;

        return (
          <Card
            key={q.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`transition-all ${dragIndex === index ? "opacity-50 scale-[0.98]" : ""}`}
          >
            <CardContent className="p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                <div className={`p-1.5 rounded ${config.bg} shrink-0`}>
                  <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  {config.label}
                </span>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => duplicateQuestion(index)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeQuestion(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Question text */}
              <Input
                value={q.question}
                onChange={(e) => updateQuestion(index, { question: e.target.value })}
                placeholder="Enter your question..."
                className="font-medium"
              />

              {/* Options for single/multiple answer */}
              {(q.type === "single_answer" || q.type === "multiple_answer") && (
                <div className="space-y-2 pl-2">
                  {q.options.map((opt, optIndex) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      {q.type === "single_answer" ? (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded border-2 border-muted-foreground/40 shrink-0" />
                      )}
                      <Input
                        value={opt.label}
                        onChange={(e) => updateOption(index, optIndex, e.target.value)}
                        placeholder={`Option ${optIndex + 1}`}
                        className="h-8 text-sm"
                      />
                      {q.options.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => removeOption(index, optIndex)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 7 && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-primary p-0 h-auto"
                      onClick={() => addOption(index)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add an option
                    </Button>
                  )}
                  <p className="text-[10px] text-muted-foreground">Max 7 options</p>
                </div>
              )}

              {/* Text answer preview */}
              {q.type === "text_answer" && (
                <div className="pl-2">
                  <div className="h-16 rounded-md border border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      Your client will write down the answer
                    </span>
                  </div>
                </div>
              )}

              {/* Rating preview */}
              {q.type === "rating" && (
                <div className="pl-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-full border border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground"
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required toggle */}
              <div className="flex items-center gap-2 pt-1 border-t">
                <Switch
                  checked={q.required}
                  onCheckedChange={(checked) => updateQuestion(index, { required: checked })}
                  id={`required-${q.id}`}
                />
                <Label htmlFor={`required-${q.id}`} className="text-xs">
                  Required
                </Label>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
