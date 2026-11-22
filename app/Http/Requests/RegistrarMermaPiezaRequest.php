<?php

namespace App\Http\Requests;

use App\Models\Producto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RegistrarMermaPiezaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'producto_id' => ['required', 'integer', 'exists:productos,id'],
            'peso_libras' => ['required', 'numeric', 'min:0.05', 'max:500'],
            'observacion' => ['required', 'string', 'max:255'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $producto = Producto::find($this->input('producto_id'));
                $libras = (float) $this->input('peso_libras');

                if ($producto && $libras > (float) $producto->stock_libras) {
                    $validator->errors()->add(
                        'peso_libras',
                        "Stock insuficiente en {$producto->nombre}. Disponible: {$producto->stock_libras} lb."
                    );
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'observacion.required' => 'Indica el motivo de la merma (ej. Recorte de pellejo en lomo).',
        ];
    }
}
