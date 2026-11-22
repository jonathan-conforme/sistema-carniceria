<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GuardarCompraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'proveedor'           => ['nullable', 'string', 'max:150'],
            'descripcion'         => ['required', 'string', 'max:255'],
            'peso_inicial_libras' => ['required', 'numeric', 'min:1', 'max:2000'],
            'costo_total'         => ['required', 'numeric', 'min:0.01', 'max:50000'],
            'fecha_compra'        => ['required', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'descripcion.required'         => 'Ingresa una descripción (ej. Medio chancho).',
            'peso_inicial_libras.required' => 'El peso inicial en libras es obligatorio.',
            'peso_inicial_libras.min'      => 'El peso debe ser mayor a 0 libras.',
            'costo_total.required'         => 'El costo total de la compra es obligatorio.',
            'fecha_compra.required'        => 'La fecha de compra es obligatoria.',
        ];
    }
}